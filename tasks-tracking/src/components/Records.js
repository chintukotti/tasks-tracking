import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { 
  Container, 
  Typography, 
  Box, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Divider
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Notes as NotesIcon,
  DoNotDisturb as DoNotDisturbIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';

const Records = ({ user, onBack }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [records, setRecords] = useState({});
  const [currentDay, setCurrentDay] = useState(1);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRecords(userData.dailyRecords || {});
          setCurrentDay(userData.currentDay || 1);
          setDays(userData.days || 7);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAccordionChange = (dayNumber) => (event, isExpanded) => {
    setExpandedDay(isExpanded ? dayNumber : null);
  };

  // Get all unique task texts across all days
  const getAllTaskTexts = () => {
    const taskTexts = new Set();
    Object.values(records).forEach(record => {
      const tasks = Array.isArray(record) ? record : (record.tasks || []);
      tasks.forEach(task => {
        taskTexts.add(task.text);
      });
    });
    return Array.from(taskTexts);
  };

  const allTaskTexts = getAllTaskTexts();

  // Generate all completed days only
  const getAllDays = () => {
    const daysArray = [];
    
    // Only include days that have a record (completed days)
    Object.entries(records).forEach(([date, record]) => {
      const recordData = Array.isArray(record) ? null : record;
      if (recordData && recordData.dayNumber) {
        daysArray.push({
          dayNumber: recordData.dayNumber,
          date: date,
          record: recordData
        });
      }
    });
    
    // Sort by day number
    daysArray.sort((a, b) => a.dayNumber - b.dayNumber);
    
    return daysArray;
  };

  const allDays = getAllDays();

  // Calculate completed tasks count for a day
  const calculateCompletedCount = (tasks) => {
    if (!tasks || tasks.length === 0) return '0/0';
    
    const completed = tasks.filter(task => task.completed).length;
    const total = tasks.length;
    
    return `${completed}/${total}`;
  };

  // Mobile Card View Component
  const MobileDayCard = ({ day }) => {
    const tasks = day.record ? (day.record.tasks || []) : [];
    const notes = day.record ? day.record.notes : '';
    const hasNoTasks = tasks.length === 0;
    
    return (
      <Card elevation={2} sx={{ mb: 2, borderRadius: 3 }}>
        <Accordion 
          expanded={expandedDay === day.dayNumber} 
          onChange={handleAccordionChange(day.dayNumber)}
          sx={{ boxShadow: 'none' }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              backgroundColor: '#f5f5f5',
              borderRadius: 3,
              '&.Mui-expanded': {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  Day {day.dayNumber}
                </Typography>
                {day.date && (
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(day.date), 'MMM dd, yyyy')}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {hasNoTasks ? (
                  <Chip 
                    size="small" 
                    label="No Tasks" 
                    color="secondary" 
                    icon={<DoNotDisturbIcon />}
                  />
                ) : (
                  <>
                    <Badge badgeContent={calculateCompletedCount(tasks)} color="primary">
                      <CheckCircleIcon />
                    </Badge>
                    <Chip 
                      size="small" 
                      label="Completed" 
                      color="primary" 
                      icon={<CheckCircleIcon />}
                    />
                  </>
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box sx={{ mt: 1 }}>
              {hasNoTasks ? (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  textAlign: 'center'
                }}>
                  <DoNotDisturbIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body1" fontWeight="bold">
                    Didn't do anything
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No tasks were added or completed on this day
                  </Typography>
                </Box>
              ) : (
                <>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Tasks:
                  </Typography>
                  <Grid container spacing={1}>
                    {allTaskTexts.map((taskText, index) => {
                      const task = tasks.find(t => t.text === taskText);
                      return (
                        <Grid item xs={12} key={index}>
                          <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5 }}>
                            {task ? (
                              task.completed ? (
                                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                              ) : (
                                <CancelIcon color="error" sx={{ mr: 1 }} />
                              )
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                -
                              </Typography>
                            )}
                            <Typography variant="body2">
                              {taskText}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </>
              )}
              
              {/* Notes Section */}
              {notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <NotesIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                      Notes:
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {notes}
                  </Typography>
                </>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <Typography>Loading your records...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        animation: 'gradient 15s ease infinite',
        backgroundSize: '200% 200%',
        pb: 4
      }}
    >
      <style>
        {`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        {/* Header with back button and title */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 4
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={onBack}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#2c3e50'
              }}
            >
              My Records
            </Typography>
          </Box>
          
          {/* User profile with dropdown */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user.photoURL && (
              <IconButton 
                onClick={handleMenuClick}
                size="small"
                sx={{ ml: 1 }}
              >
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  style={{ width: 32, height: 32, borderRadius: '50%' }}
                />
              </IconButton>
            )}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>
                <Typography variant="body2">{user.displayName || user.email}</Typography>
              </MenuItem>
              <MenuItem onClick={() => { auth.signOut(); handleMenuClose(); }}>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        
        {/* Records View - Different for mobile and desktop */}
        {allDays.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No records found. Complete some tasks to see them here!
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Mobile View - Card Layout */}
            {isMobile && (
              <Box>
                {allDays.map(day => (
                  <MobileDayCard key={day.dayNumber} day={day} />
                ))}
              </Box>
            )}
            
            {/* Desktop/Tablet View - Table Layout */}
            {!isMobile && (
              <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: '70vh', overflowX: 'auto' }}>
                  <Table stickyHeader aria-label="records table">
                    <TableHead>
                      <TableRow>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: '#f5f5f5',
                            position: 'sticky',
                            left: 0,
                            zIndex: 1,
                            minWidth: '120px'
                          }}
                        >
                          Day
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: '#f5f5f5',
                            minWidth: '100px'
                          }}
                        >
                          Status
                        </TableCell>
                        {!isTablet && (
                          <TableCell 
                            sx={{ 
                              fontWeight: 'bold', 
                              backgroundColor: '#f5f5f5',
                              minWidth: '150px'
                            }}
                          >
                            Notes
                          </TableCell>
                        )}
                        {allTaskTexts.map((taskText, index) => (
                          <TableCell 
                            key={index} 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold', 
                              backgroundColor: '#f5f5f5',
                              minWidth: '150px'
                            }}
                          >
                            {taskText}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allDays.map(day => {
                        const tasks = day.record ? (day.record.tasks || []) : [];
                        const notes = day.record ? day.record.notes : '';
                        const hasNoTasks = tasks.length === 0;
                        
                        return (
                          <TableRow key={day.dayNumber} hover>
                            <TableCell 
                              component="th" 
                              scope="row"
                              sx={{ 
                                fontWeight: 'bold',
                                position: 'sticky',
                                left: 0,
                                backgroundColor: 'white',
                                zIndex: 1
                              }}
                            >
                              <Box>
                                <Typography variant="body1">
                                  Day {day.dayNumber}
                                </Typography>
                                {day.date && (
                                  <Typography variant="caption" color="text.secondary">
                                    {format(parseISO(day.date), 'MMM dd')}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {hasNoTasks ? (
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <DoNotDisturbIcon color="secondary" sx={{ mr: 1 }} />
                                  <Typography variant="body2">
                                    Didn't do anything
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2">
                                  {calculateCompletedCount(tasks)}
                                </Typography>
                              )}
                            </TableCell>
                            {!isTablet && (
                              <TableCell>
                                <Tooltip title={notes || "No notes for this day"}>
                                  <Box 
                                    sx={{ 
                                      maxWidth: '150px', 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {notes || '-'}
                                  </Box>
                                </Tooltip>
                              </TableCell>
                            )}
                            {allTaskTexts.map((taskText, taskIndex) => {
                              const task = tasks.find(t => t.text === taskText);
                              return (
                                <TableCell 
                                  key={taskIndex} 
                                  align="center"
                                  sx={{ minWidth: '150px' }}
                                >
                                  {hasNoTasks ? (
                                    <Typography variant="body2" color="text.secondary">
                                      -
                                    </Typography>
                                  ) : task ? (
                                    task.completed ? (
                                      <CheckCircleIcon color="success" />
                                    ) : (
                                      <CancelIcon color="error" />
                                    )
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      -
                                    </Typography>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default Records;