export {
  libraryTrackerPlugin,
  LibraryTrackerPage,
  EntityLibraryTrackerContent,
  SystemLibraryTrackerContent,
} from './plugin';
export { libraryTrackerApiRef } from './api';
export type { LibraryTrackerApi } from './api';

// Icon for use in the Backstage sidebar (SidebarItem icon prop).
export { default as LibraryTrackerIcon } from '@material-ui/icons/AccountTree';
