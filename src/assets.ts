import authorMale from '../asserts/author_male.png';
import authorFemale from '../asserts/author_female.png';
import reviewer from '../asserts/reviewer.png';
import reviewer1 from '../asserts/reviewer1.png';

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
