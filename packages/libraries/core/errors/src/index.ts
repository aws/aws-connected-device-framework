export class InvalidArgumentError extends Error {
  public readonly argumentName: string;
  constructor(argumentName: string, message?: string) {
    super(message);
    this.argumentName = argumentName;
    this.name = 'InvalidArgumentError';
  }
}

export class ItemAlreadyExistsError extends Error {
  public readonly itemId: string;
  constructor(itemId: string, message?: string) {
    super(message);
    this.itemId = itemId;
    this.name = 'ItemAlreadyExistsError';
  }
}

export class ItemDoesNotExistError extends Error {
  public readonly itemId: string;
  constructor(itemId: string, message?: string) {
    super(message);
    this.itemId = itemId;
    this.name = 'ItemDoesNotExistError';
    }
}

export class ConcurrentModificationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'ConcurrentModificationError';
  }
}

export class DbError extends Error {
  public cause: any;
  constructor(dbError: any, message?: string) {
    super(message);
    this.cause = dbError;
    this.name = 'DbError';
  }
}
