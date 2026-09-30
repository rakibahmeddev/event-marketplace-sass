import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faCampground,
  faChildReaching,
  faFaceLaughBeam,
  faFutbol,
  faLaptopCode,
  faMartiniGlassCitrus,
  faMicrophoneLines,
  faMusic,
  faPalette,
  faScrewdriverWrench,
  faTag,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import type { CategoryIcon } from '@/lib/categories/schema';

export const categoryIcons: Record<CategoryIcon, IconDefinition> = {
  music: faMusic,
  sports: faFutbol,
  workshop: faScrewdriverWrench,
  festival: faCampground,
  conference: faMicrophoneLines,
  nightlife: faMartiniGlassCitrus,
  comedy: faFaceLaughBeam,
  arts: faPalette,
  food: faUtensils,
  family: faChildReaching,
  tech: faLaptopCode,
  other: faTag,
};
