import authorMale from '../asserts/author_male.webp';
import authorFemale from '../asserts/author_female.webp';
import reviewer from '../asserts/reviewer.webp';
import reviewer1 from '../asserts/reviewer1.webp';

export type AuthorKind = 'male' | 'female';

export const ASSETS = {
  authorMale,
  authorFemale,
  reviewer,
  reviewer1,
};

export function authorImage(kind: AuthorKind): string {
  return kind === 'male' ? authorMale : authorFemale;
}

export function reviewerImage(): string {
  return reviewer;
}
