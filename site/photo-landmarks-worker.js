let model;
async function getModel() {
  if (!model) model = (async () => {
    const { FilesetResolver, FaceLandmarker } = await import('./vision/vision_bundle.mjs');
    const files = await FilesetResolver.forVisionTasks(new URL('./wasm', self.location.href).href, true);
    return FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: new URL('./models/face_landmarker.task', self.location.href).href, delegate: 'CPU' },
      // Use the model's default thresholds: transparent glasses should not be
      // rejected just because their rims reduce detection confidence.
      runningMode: 'IMAGE', numFaces: 2, minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5,
    });
  })();
  return model;
}
self.onmessage = async ({ data: { id, bitmap } }) => {
  try {
    const detector = await getModel();
    const result = detector.detect(bitmap);
    if (result.faceLandmarks.length === 0) { self.postMessage({ id, error: 'preview_no_face' }); return; }
    if (result.faceLandmarks.length !== 1) { self.postMessage({ id, error: 'preview_multiple_faces' }); return; }
    self.postMessage({ id, landmarks: result.faceLandmarks[0].map(({ x, y }) => ({ x, y })) });
  } catch (error) {
    console.error("Photo face model:", error instanceof Error ? error.message : String(error));
    model = undefined;
    self.postMessage({ id, error: 'preview_model_unavailable' });
  } finally { bitmap.close(); }
};
