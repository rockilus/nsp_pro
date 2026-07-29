import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { Add, Delete, PlayArrow } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useTranslation } from '../../../app/i18n/client';
import { AssignmentTemplateListItem, TemplateType } from '../../../types/assignment-template';

interface ScheduleTemplateListProps {
  lng: string;
  teamId: string;
  templates: AssignmentTemplateListItem[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: AssignmentTemplateListItem) => void;
  onApplyTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: () => void;
  onError: (error: string) => void;
  onTemplatesLoaded: (templates: AssignmentTemplateListItem[]) => void;
  onLoadTemplates: () => Promise<void>;
  onDeleteTemplateRequest: (templateId: string) => Promise<void>;
}

export function ScheduleTemplateList({
  lng,
  teamId,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onApplyTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  onError,
  onTemplatesLoaded,
  onLoadTemplates,
  onDeleteTemplateRequest,
}: ScheduleTemplateListProps) {
  const { t } = useTranslation(lng, 'assignment-templates');
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      onLoadTemplates()
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }
  }, [teamId]);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {t('templates')}
        </Typography>
        <Tooltip title={t('create_new_template')}>
          <IconButton size="small" onClick={onCreateTemplate} data-testid="create-template-btn">
            <Add />
          </IconButton>
        </Tooltip>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : templates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="textSecondary">
            {t('no_templates')}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={onCreateTemplate}
            sx={{ mt: 1, textTransform: 'none' }}
          >
            {t('create_new_template')}
          </Button>
        </Box>
      ) : (
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {templates.map((tmpl) => (
            <ListItemButton
              key={tmpl.id}
              selected={selectedTemplateId === tmpl.id}
              onClick={() => onSelectTemplate(tmpl)}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemText
                primary={tmpl.name}
                secondary={`${tmpl.totalEntries} entries - ${tmpl.createdAt.format('ll')}`}
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <Tooltip title={t('apply')}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyTemplate(tmpl.id);
                    }}
                    data-testid={`apply-template-${tmpl.id}`}
                  >
                    <PlayArrow fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('delete_template')}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(t('confirm_delete_template'))) {
                        onDeleteTemplateRequest(tmpl.id);
                      }
                    }}
                    data-testid={`delete-template-${tmpl.id}`}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}
