import { useState } from 'react';
import Box from '@material-ui/core/Box';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import { Content, Header, Page } from '@backstage/core-components';
import { OverviewDashboard } from './OverviewDashboard';
import { PackageSearch } from './PackageSearch';
import { ScanStatusView } from './ScanStatusView';
import { AllDependencies, DuplicatesReport, OutdatedReport, UnusedReport } from './reports';

const TABS = [
  { label: 'Overview', content: <OverviewDashboard /> },
  { label: 'All dependencies', content: <AllDependencies /> },
  { label: 'Package search', content: <PackageSearch /> },
  { label: 'Outdated', content: <OutdatedReport /> },
  { label: 'Unused', content: <UnusedReport /> },
  { label: 'Duplicate versions', content: <DuplicatesReport /> },
  { label: 'Scan status', content: <ScanStatusView /> },
];

/** Org-wide library-tracker page. Each tab mounts (and fetches) only when selected. */
export const LibraryTrackerPage = () => {
  const [index, setIndex] = useState(0);

  return (
    <Page themeId="tool">
      <Header title="Library Tracker" subtitle="Org-wide dependency visibility" />
      <Content>
        <Tabs
          value={index}
          onChange={(_, value) => setIndex(value)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map(tab => (
            <Tab key={tab.label} label={tab.label} />
          ))}
        </Tabs>
        <Box mt={2}>{TABS[index].content}</Box>
      </Content>
    </Page>
  );
};
