import Chip from '@material-ui/core/Chip';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Button from '@material-ui/core/Button';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import CodeIcon from '@material-ui/icons/Code';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { Progress, ResponseErrorPanel } from '@backstage/core-components';
import { libraryTrackerApiRef } from '../api';
import { buildSourceFileUrl } from '../utils/sourceUrl';

const useStyles = makeStyles(theme => ({
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(0.5),
  },
  fileChip: {
    fontFamily: 'monospace',
    fontSize: '0.78rem',
  },
  occurrenceLine: {
    fontFamily: 'monospace',
    fontSize: '0.82rem',
    color: theme.palette.text.secondary,
  },
  noOccurrences: {
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
}));

export interface OccurrenceDialogProps {
  name?: string;
  entityRef?: string;
  open: boolean;
  onClose: () => void;
}

/** Shows the files and lines where a library is imported, with direct VCS links when available. */
export const OccurrenceDialog = ({ name, entityRef, open, onClose }: OccurrenceDialogProps) => {
  const api = useApi(libraryTrackerApiRef);
  const classes = useStyles();
  const { value, loading, error } = useAsync(
    () => (open && name ? api.getOccurrences(name, entityRef) : Promise.resolve([])),
    [name, entityRef, open],
  );

  const totalOccurrences = value?.reduce((sum, g) => sum + g.occurrences.length, 0) ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gridGap={8}>
          <CodeIcon color="primary" />
          <span>Usages of <strong>{name}</strong></span>
          {!loading && value && value.length > 0 && (
            <Chip size="small" label={`${totalOccurrences} occurrence${totalOccurrences !== 1 ? 's' : ''}`} />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && <Progress />}
        {error && <ResponseErrorPanel error={error} />}
        {value && value.length === 0 && !loading && (
          <Typography className={classes.noOccurrences}>
            No imports found in the scanned source.
          </Typography>
        )}

        {value?.map((group, gi) => (
          <Box key={`${group.entityRef}::${group.manifestPath}`}>
            {gi > 0 && <Divider />}
            <Box className={classes.groupHeader}>
              <Typography variant="subtitle2">{group.entityRef}</Typography>
              <Chip
                size="small"
                label={group.manifestPath}
                variant="outlined"
                className={classes.fileChip}
              />
            </Box>

            <List dense disablePadding>
              {group.occurrences.map(occ => {
                const fileUrl = group.repoUrl
                  ? buildSourceFileUrl(group.repoUrl, occ.path, occ.line)
                  : undefined;

                return (
                  <ListItem key={`${occ.path}:${occ.line}`} dense>
                    <ListItemText
                      primary={
                        <Typography component="span" className={classes.occurrenceLine}>
                          {occ.path}
                          <Typography component="span" variant="caption" color="textSecondary">
                            {' '}:{occ.line}
                          </Typography>
                        </Typography>
                      }
                    />
                    {fileUrl && (
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label="open in VCS"
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          component="a"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
