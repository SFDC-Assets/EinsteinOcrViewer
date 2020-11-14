import { LightningElement, api, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import EINSTEIN_IMAGES from '@salesforce/resourceUrl/einsteinplay__einstein_images';
import RESIZE from '@salesforce/resourceUrl/einsteinplay__resize';

import { handleConfirmation, handleWarning, handleErrors } from 'c/einsteinUtils';

import ocrScan from '@salesforce/apex/OcrViewerController.ocrScan';

export default class EinsteinOcrViewerLwc extends LightningElement {

	@api title;

	hasRendered = false;

	baseCompName = 'c-einstein-playground-base-lwc';
	platformCardName = 'c-einstein-platform-card-lwc';

	pictureSrc = EINSTEIN_IMAGES + '/einstein_images/EinsteinVIsionDefault.png';

	tableData = [];
	columns = [
		{ label: 'Label', fieldName: 'label', sortable: true, hideDefaultActions: true },
		{ label: 'Min X', fieldName: 'minX', type: 'number',sortable: true, hideDefaultActions: true },
		{ label: 'Max X', fieldName: 'maxX', type: 'number',sortable: true, hideDefaultActions: true },
		{ label: 'Min Y', fieldName: 'minY', type: 'number',sortable: true, hideDefaultActions: true },
		{ label: 'Max Y', fieldName: 'maxY', type: 'number', sortable: true, hideDefaultActions: true }
	];
	defaultSortDirection = "asc";
	sortDirection = "asc";
	sortedBy;
	probabilities;
	resizeObserver;

	checkboxValue = ['showLabels'];
	get checkboxOptions() {
		return [
			{ label: 'Show labels', value: 'showLabels' }
		];
	}

	handleCheckboxChange(e) {
		console.log('handleCheckboxChange');
		this.checkboxValue = e.detail.value;
		var style = (this.checkboxValue.includes('showLabels') ? "visible" : "hidden");

		var divs = this.template.querySelectorAll('.after div');
		for (var i = 0; i < divs.length; i++) {
			divs[i].style.visibility = style;
		}
	}

	renderedCallback() {
		console.log('renderedCallback');

		if (!this.hasRendered) {
			this.hasRendered = true;
			this.template.querySelector(this.platformCardName).hasData = true;
			loadScript(this, RESIZE);
		}
	}

	// Used to sort the columns
	sortBy(field, reverse, primer) {
		const key = primer
			? function (x) {
				return primer(x[field]);
			}
			: function (x) {
				return x[field];
			};
	
		return function (a, b) {
			a = key(a);
			b = key(b);
			return reverse * ((a > b) - (b > a));
		};
	}
	
	onHandleSort(event) {
		const { fieldName: sortedBy, sortDirection } = event.detail;
		const cloneData = [...this.tableData];

		cloneData.sort(
			this.sortBy(sortedBy, sortDirection === "asc" ? 1 : -1)
		);
		this.tableData = cloneData;
		this.sortDirection = sortDirection;
		this.sortedBy = sortedBy;
	}
		
	clearPredictions() {
        console.log('clearPredictions');

        // Stop observing changes to the image container so it doesn't freak out when the pictureSrc is cleared
        if (this.resizeObserver) {
            console.log('disconnect resizeObserver');
            this.resizeObserver.disconnect();
        }

        // Remove any existing DIVs from overlay 
        var imgContainer = this.template.querySelector(".picture");
        if (imgContainer) {
            while (imgContainer.firstChild) {
                imgContainer.removeChild(imgContainer.firstChild);
            }
        }

        this.probabilities = [];
		this.pictureSrc = "";
	}

	onFileSelected(event) {
		// input type='"file" handler.
		var self = this;
		console.log('onFileSelected');
		var selectedFile = event.target.files[0];
		console.log("SelectedFile ", selectedFile);
		self.clearPredictions();
		
		var reader = new FileReader();
		reader.onload = function (event) {
			self.pictureSrc = event.target.result;
		};
		this.probability = 0;
		this.readFile(selectedFile);
	}

	readFile(file) {
		self = this;
		if (!file) return;
		if (!file.type.match(/(image.*)/)) {
			return handleErrors({ message: "Image file not supported" });
		}
		var reader = new FileReader();
		reader.onloadend = function() {
			var dataURL = reader.result;
			self.pictureSrc = dataURL;
			self.analyse(dataURL.match(/,(.*)$/)[1]);
		};
		reader.readAsDataURL(file);
	}
	
	analyse(base64Data) {
		console.log('analyse');
		this.template.querySelector(this.baseCompName).setSpinnerWaiting(true);
		var self = this;

		ocrScan({
			base64: base64Data
		})
		.then(result => {
			this.template.querySelector(this.baseCompName).setSpinnerWaiting(false);
			this.probabilities = result.probabilities;
			console.log('scanned probabilities: ', this.probabilities);

			self.resizeObserver = new ResizeObserver(entries => {
				this.generateSvg();
			});
			
			var img = this.template.querySelector(".picture");
			self.resizeObserver.observe(img);

			self.setTableData();

		})
		.catch(error => {
			handleErrors(error);
		});
	  }

	setTableData() {
		console.log('setTableData');

		var localData = [];
		this.probabilities.forEach(function (item, index) {
			var newItem = {};
			newItem.index = index;
			newItem.label = item.label;
			newItem.probability = item.probability;
			newItem.minX = item.boundingBox.minX;
			newItem.maxX = item.boundingBox.maxX;
			newItem.minY = item.boundingBox.minY;
			newItem.maxY = item.boundingBox.maxY;

			localData.push(newItem);
		});

		this.tableData = localData;
	}

	onDragOver(event) {
		console.log('onDragOver');
		event.preventDefault();
	}

	onDrop(event) {
		console.log('onDrop');
		event.stopPropagation();
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
		var files = event.dataTransfer.files;
		console.log('files: ', files[0]);
		if (files.length > 1) {
			return handleErrors({ message: "You can only analyse one picture at a time" });
		}
		if (files[0].size > 5000000) {
			return handleErrors({ message: "The file exceeds the limit of 5MB." });
		}
		this.probability = 0;
		this.readFile(files[0]);

	}


    generateSvg() {
        console.log("generateSvg");
        var self = this;
		var dataType = this.type;

        var imgContainer = self.template.querySelector('.after');
        // Remove any existing DIVs from overlay 
        while (imgContainer.firstChild) {
            imgContainer.removeChild(imgContainer.firstChild);
        }

        var img = self.template.querySelector('.picture');
        var proportion = img.clientHeight / img.naturalHeight;
        if (proportion > 1) {
            proportion = 1;
        }

        var probabilities = this.probabilities;

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        var svgNS = svg.namespaceURI;
        svg.classList.add('svg');

        var leftPos = img.offsetLeft;
        var topPos = img.offsetTop;

        // Create transparent boxes for each label, positioned according to the
        // BoundingBox of the prediction
        probabilities.forEach(function (probability, index) {
            var color = '#e6194b';
            // create polygon for box
            var polygon = document.createElementNS(svgNS, "polygon");
            polygon.setAttribute(
                "style",
                "stroke:" + color + ';stroke-width:"3";fill-opacity:0;'
            );
            var points = [];
            points.push(
                (probability.boundingBox.minX * proportion + leftPos) +
                "," +
                (probability.boundingBox.minY * proportion + topPos)
            );
            points.push(
                (probability.boundingBox.maxX * proportion + leftPos) +
                "," +
                (probability.boundingBox.minY * proportion + topPos)
            );
            points.push(
                (probability.boundingBox.maxX * proportion + leftPos) +
                "," +
                (probability.boundingBox.maxY * proportion + topPos)
            );
            points.push(
                (probability.boundingBox.minX * proportion + leftPos) +
                "," +
                (probability.boundingBox.maxY * proportion + topPos)
            );
            polygon.setAttribute("points", points.join(" "));

            polygon.setAttribute("data-id", "polygon"+index);
            polygon.classList.add('polygon');

            svg.appendChild(polygon);

			// create text label near the polygon for each prediction
			var div = document.createElement("div");
			div.setAttribute(
				"style",
				"position:absolute;top:" +
				probability.boundingBox.maxY * proportion +
				"px;left:" +
				(probability.boundingBox.minX * proportion + leftPos) +
				"px;width:" +
				(probability.boundingBox.maxX - probability.boundingBox.minX) *
				proportion +
				"px;text-align:center;color:" +
				color +
				";"
			);
			div.innerHTML = probability.label;
			imgContainer.appendChild(div);
        }, this);

        imgContainer.appendChild(svg);
    }

}