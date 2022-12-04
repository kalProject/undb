import type { Result } from 'oxide.ts'

export interface ISpecification<T = any, V = any> {
  isSatisfiedBy(t: T): boolean
  mutate(t: T): Result<T, string>
  accept(v: V): Result<void, string>
}

export abstract class CompositeSpecification<T = any, V = any> implements ISpecification<T, V> {
  abstract isSatisfiedBy(t: T): boolean
  abstract mutate(t: T): Result<T, string>
  abstract accept(v: V): Result<void, string>

  public and(s: ISpecification<T, V>): CompositeSpecification<T, V> {
    return new And(this, s)
  }

  public or(s: ISpecification<T, V>): CompositeSpecification<T, V> {
    return new Or(this, s)
  }

  public not(): CompositeSpecification<T, V> {
    return new Not(this)
  }
}

class And<T, V> extends CompositeSpecification<T, V> {
  constructor(private readonly left: ISpecification<T, V>, private readonly right: ISpecification<T, V>) {
    super()
  }

  isSatisfiedBy(t: T): boolean {
    return this.left.isSatisfiedBy(t) && this.right.isSatisfiedBy(t)
  }

  mutate(t: T): Result<T, string> {
    return this.left.mutate(t).and(this.right.mutate(t))
  }

  accept(v: V): Result<void, string> {
    return this.left.accept(v).and(this.right.accept(v))
  }
}

class Or<T, V> extends CompositeSpecification<T, V> {
  constructor(private readonly left: ISpecification<T, V>, private readonly right: ISpecification<T, V>) {
    super()
  }

  isSatisfiedBy(t: T): boolean {
    return this.left.isSatisfiedBy(t) || this.right.isSatisfiedBy(t)
  }

  mutate(t: T): Result<T, string> {
    return this.left.mutate(t).orElse(() => this.right.mutate(t))
  }

  accept(v: V): Result<void, string> {
    return this.left.accept(v).or(this.right.accept(v))
  }
}

class Not<T> extends CompositeSpecification<T> {
  constructor(private readonly spec: ISpecification<T>) {
    super()
  }

  isSatisfiedBy(t: T): boolean {
    return !this.spec.isSatisfiedBy(t)
  }

  mutate(t: T): Result<T, string> {
    throw new Error('Method not implemented.')
  }

  accept(v: any): Result<void, string> {
    throw new Error('Method not implemented.')
  }
}
