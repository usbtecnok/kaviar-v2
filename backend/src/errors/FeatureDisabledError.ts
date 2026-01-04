export class FeatureDisabledError extends Error {
  constructor(message: string = 'Feature not available') {
    super(message);
    this.name = 'FeatureDisabledError';
  }
}
