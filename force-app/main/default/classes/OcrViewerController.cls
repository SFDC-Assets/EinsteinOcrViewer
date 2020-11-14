public with sharing class OcrViewerController {

	@AuraEnabled
	public static einsteinplay.Einstein_PredictionResult ocrScan(String base64) {

		try {

			// Use the Playground wrappers to perform an OCR scan on the base64 image provided
			einsteinplay.Einstein_PredictionService service = new einsteinplay.Einstein_PredictionService(einsteinplay.Einstein_PredictionService.Types.OCR);
			einsteinplay.Einstein_PredictionResult result = service.predictOcrBase64('OCRModel', base64, 'text', 0, '');

			return result;

		} catch(Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

}
