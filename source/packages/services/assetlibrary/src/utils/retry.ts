import { setTimeout } from 'timers/promises';

import { logger } from '@awssolutions/simple-cdf-logger';

interface IRetryOptions {
    maxAttempts: number;

    startingDelay: number;

    shouldRetry: (e: Error) => boolean;
}

export type RetryOptions = Partial<IRetryOptions>;

export async function retry<T>(request: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const opts = { maxAttempts: 3, startingDelay: 100, shouldRetry: () => true, ...options };

    const backoff = new ExponentialBackoff(request, opts);

    return await backoff.execute();
}

class ExponentialBackoff<T> {
    private attempts = 0;

    constructor(private request: () => Promise<T>, private options: IRetryOptions) {}

    public async execute(): Promise<T> {
        while (!this.attemptLimitReached) {
            try {
                return await this.request();
            } catch (e) {
                logger.info(`utils.retry.execute: catch: ${e}`);

                this.attempts++;

                const shouldRetry = this.options.shouldRetry(e);

                if (!shouldRetry || this.attemptLimitReached) {
                    throw e;
                }

                await this.applyDelay();
            }
        }

        throw new Error('Something went wrong.');
    }

    private get attemptLimitReached() {
        return this.attempts >= this.options.maxAttempts;
    }

    private async applyDelay() {
        const delay = Math.round(
            this.options.startingDelay * Math.pow(2, this.attempts) * Math.random()
        );

        await setTimeout(delay);
    }
}
