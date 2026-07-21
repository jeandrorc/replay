import { DomainValidationError } from './domain-validation-error.js';

const MAXIMUM_IDENTIFIER_LENGTH = 128;

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint <= 31 || codePoint === 127);
  });
}

export class Identifier<Kind extends string> {
  declare private readonly identifierKind: Kind;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  public static fromString<Kind extends string>(
    value: string,
  ): Identifier<Kind> {
    if (value.length === 0) {
      throw new DomainValidationError(
        'identifier.empty',
        'An identifier cannot be empty.',
      );
    }
    if (value.trim() !== value) {
      throw new DomainValidationError(
        'identifier.whitespace',
        'An identifier cannot have leading or trailing whitespace.',
      );
    }
    if (value.length > MAXIMUM_IDENTIFIER_LENGTH) {
      throw new DomainValidationError(
        'identifier.too_long',
        `An identifier cannot exceed ${String(MAXIMUM_IDENTIFIER_LENGTH)} characters.`,
      );
    }
    if (containsControlCharacter(value)) {
      throw new DomainValidationError(
        'identifier.control_character',
        'An identifier cannot contain control characters.',
      );
    }

    return new Identifier<Kind>(value);
  }

  public equals(other: Identifier<Kind>): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
