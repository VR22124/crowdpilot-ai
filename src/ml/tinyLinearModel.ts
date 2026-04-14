export interface TinyLinearModelState {
  weights: number[]
  bias: number
  learningRate: number
}

export class TinyLinearModel {
  private state: TinyLinearModelState

  constructor(featureCount: number, learningRate = 0.02) {
    this.state = {
      weights: Array.from({ length: featureCount }, () => 0),
      bias: 0,
      learningRate,
    }
  }

  predict(features: number[]): number {
    let sum = this.state.bias
    for (let index = 0; index < this.state.weights.length; index += 1) {
      sum += this.state.weights[index] * (features[index] ?? 0)
    }

    // Clamp to probability-like score [0..1]
    return Math.max(0, Math.min(1, 1 / (1 + Math.exp(-sum))))
  }

  train(features: number[], target: number): void {
    const prediction = this.predict(features)
    const error = target - prediction

    for (let index = 0; index < this.state.weights.length; index += 1) {
      this.state.weights[index] += this.state.learningRate * error * (features[index] ?? 0)
    }

    this.state.bias += this.state.learningRate * error
  }

  exportState(): TinyLinearModelState {
    return {
      weights: [...this.state.weights],
      bias: this.state.bias,
      learningRate: this.state.learningRate,
    }
  }

  importState(next: TinyLinearModelState): void {
    this.state = {
      weights: [...next.weights],
      bias: next.bias,
      learningRate: next.learningRate,
    }
  }
}
