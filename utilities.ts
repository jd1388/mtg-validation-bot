export const delay = (delayLength: number = 1000): Promise<void> => new Promise((resolve) => setTimeout(resolve, delayLength));
