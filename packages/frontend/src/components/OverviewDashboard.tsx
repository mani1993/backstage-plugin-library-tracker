import { ReactNode } from 'react';
import Box from '@material-ui/core/Box';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Chip from '@material-ui/core/Chip';
import Grid from '@material-ui/core/Grid';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import BugReportIcon from '@material-ui/icons/BugReport';
import LayersIcon from '@material-ui/icons/Layers';
import WarningIcon from '@material-ui/icons/Warning';
import useAsync from 'react-use/lib/useAsync';
import { ResponseErrorPanel, Progress } from '@backstage/core-components';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { DriftSeverity } from 'backstage-plugin-library-tracker-common';
import { libraryTrackerApiRef } from '../api';

const useStyles = makeStyles(theme => ({
  statCard: {
    height: '100%',
  },
  statValue: {
    fontSize: '2.4rem',
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: theme.spacing(0.5),
  },
  statLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statIcon: {
    marginBottom: theme.spacing(1),
    fontSize: '1.8rem',
    opacity: 0.75,
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1.5),
  },
  ecosystemChip: {
    margin: theme.spacing(0.3),
    fontWeight: 600,
  },
  tableHeaderRow: {
    backgroundColor: theme.palette.type === 'dark'
      ? theme.palette.grey[800]
      : theme.palette.grey[100],
  },
}));

const SEVERITY_COLORS: Record<DriftSeverity, string> = {
  major: '#f44336',
  minor: '#ff9800',
  patch: '#4caf50',
  'up-to-date': '#2196f3',
  unknown: '#9e9e9e',
};

const SEVERITY_ORDER: DriftSeverity[] = ['major', 'minor', 'patch', 'up-to-date', 'unknown'];

interface StatCardProps {
  icon: ReactNode;
  value: number;
  label: string;
  iconColor?: string;
}

function StatCard({ icon, value, label, iconColor }: StatCardProps) {
  const classes = useStyles();
  return (
    <Card className={classes.statCard} variant="outlined">
      <CardContent>
        <Box className={classes.statIcon} style={{ color: iconColor }}>
          {icon}
        </Box>
        <Typography className={classes.statValue}>
          {value.toLocaleString()}
        </Typography>
        <Typography className={classes.statLabel}>{label}</Typography>
      </CardContent>
    </Card>
  );
}

/** Simple coloured progress bar — avoids MUI LinearProgress override complexity. */
function ColourBar({ pct, colour }: { pct: number; colour: string }) {
  return (
    <Box style={{ height: 8, borderRadius: 4, backgroundColor: `${colour}22`, marginTop: 4 }}>
      <Box
        style={{
          height: '100%',
          width: `${Math.max(pct, 2)}%`,
          borderRadius: 4,
          backgroundColor: colour,
          transition: 'width 0.3s ease',
        }}
      />
    </Box>
  );
}

/** Org-wide health snapshot — counts, drift breakdown, ecosystem spread, top affected components. */
export const OverviewDashboard = () => {
  const api = useApi(libraryTrackerApiRef);
  const classes = useStyles();
  const { value: stats, loading, error } = useAsync(() => api.getOverviewStats(), []);

  if (loading) return <Progress />;
  if (error) return <ResponseErrorPanel error={error} />;
  if (!stats) return null;

  const totalForBar = Object.values(stats.byDriftSeverity).reduce((a, b) => a + b, 0) || 1;
  const outdatedCount =
    (stats.byDriftSeverity.major ?? 0) +
    (stats.byDriftSeverity.minor ?? 0) +
    (stats.byDriftSeverity.patch ?? 0);

  return (
    <Box>
      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<AccountTreeIcon fontSize="inherit" />} value={stats.totalComponents} label="Components scanned" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<LayersIcon fontSize="inherit" />} value={stats.totalDependencies} label="Total dependencies" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<WarningIcon fontSize="inherit" />} value={outdatedCount} label="Outdated" iconColor="#ff9800" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard icon={<BugReportIcon fontSize="inherit" />} value={stats.unusedCount} label="Declared unused" iconColor="#f44336" />
        </Grid>
      </Grid>

      <Box mt={3}>
        <Grid container spacing={3}>
          {/* ── Drift breakdown ─────────────────────────────────────── */}
          <Grid item xs={12} md={5}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" className={classes.sectionTitle}>Drift breakdown</Typography>
                {SEVERITY_ORDER.map(sev => {
                  const count = stats.byDriftSeverity[sev] ?? 0;
                  const pct = Math.round((count / totalForBar) * 100);
                  return (
                    <Box key={sev} mb={1.5}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" style={{ textTransform: 'capitalize' }}>
                          {sev === 'up-to-date' ? 'Up to date' : sev}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {count} ({pct}%)
                        </Typography>
                      </Box>
                      <ColourBar pct={pct} colour={SEVERITY_COLORS[sev]} />
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>

          {/* ── Ecosystem counts ─────────────────────────────────────── */}
          <Grid item xs={12} md={3}>
            <Card variant="outlined" style={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" className={classes.sectionTitle}>By ecosystem</Typography>
                <Box display="flex" flexWrap="wrap">
                  {Object.entries(stats.byEcosystem).map(([eco, count]) => (
                    <Chip
                      key={eco}
                      label={`${eco} · ${count}`}
                      size="small"
                      variant="outlined"
                      className={classes.ecosystemChip}
                    />
                  ))}
                  {Object.keys(stats.byEcosystem).length === 0 && (
                    <Typography variant="body2" color="textSecondary">No data yet.</Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ── Top affected ──────────────────────────────────────────── */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" style={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" className={classes.sectionTitle}>Most affected (major drift)</Typography>
                {stats.topAffected.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">No major-drift dependencies.</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow className={classes.tableHeaderRow}>
                        <TableCell><strong>Component</strong></TableCell>
                        <TableCell align="right"><strong>Major</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stats.topAffected.map(row => (
                        <TableRow key={row.entityRef} hover>
                          <TableCell>
                            <EntityRefLink entityRef={row.entityRef} />
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={row.majorCount}
                              style={{
                                backgroundColor: '#f4433615',
                                color: '#f44336',
                                fontWeight: 700,
                                minWidth: 32,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
