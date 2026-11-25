import authorMale from '../asserts/author_male.png';
import authorFemale from '../asserts/author_female.png';
import reviewer from '../asserts/reviewer.png';

export type AuthorKind = 'male' | 'female';

export const ASSETS = {
  authorMale,
  authorFemale,
  reviewer,
};

export function authorImage(kind: AuthorKind): string {
  return kind === 'male' ? authorMale : authorFemale;
}
