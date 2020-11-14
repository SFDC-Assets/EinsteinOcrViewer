import { LightningElement, api } from 'lwc';
import EINSTEIN_IMAGES from '@salesforce/resourceUrl/einsteinplay__einstein_images';

export default class EinsteinPlatformCardLwc extends LightningElement {
	@api cardLabel = '';
	@api hasData = false;
	headerImg = EINSTEIN_IMAGES + '/einstein_images/einstein_header_icon.svg';
	backgroundImg = 'background-image: ' + EINSTEIN_IMAGES + '/einstein_images/einstein_header_background.svg';
}