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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Avatar,
  CircularProgress
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Notes as NotesIcon,
  DoNotDisturb as DoNotDisturbIcon,
  CalendarToday as CalendarTodayIcon
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

  const getAllDays = () => {
    const daysArray = [];
    
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
    
    daysArray.sort((a, b) => a.dayNumber - b.dayNumber);
    
    return daysArray;
  };

  const allDays = getAllDays();

  const calculateCompletedCount = (tasks) => {
    if (!tasks || tasks.length === 0) return '0/0';
    
    const completed = tasks.filter(task => task.completed).length;
    const total = tasks.length;
    
    return `${completed}/${total}`;
  };

  const MobileDayCard = ({ day }) => {
    const tasks = day.record ? (day.record.tasks || []) : [];
    const notes = day.record ? day.record.notes : '';
    const hasNoTasks = tasks.length === 0;
    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    
    return (
      <Card elevation={2} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Accordion 
          expanded={expandedDay === day.dayNumber} 
          onChange={handleAccordionChange(day.dayNumber)}
          sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}
        >
          <AccordionSummary 
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              backgroundColor: '#f8f9fa',
              minHeight: '56px',
              '&.Mui-expanded': {
                minHeight: '56px',
              },
              '& .MuiAccordionSummary-content': {
                margin: '8px 0',
                '&.Mui-expanded': {
                  margin: '8px 0',
                }
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Day {day.dayNumber}
                </Typography>
                {day.date && (
                  <Typography variant="caption" color="text.secondary">
                    {format(parseISO(day.date), 'MMM dd, yyyy')}
                  </Typography>
                )}
              </Box>
              <Box>
                {hasNoTasks ? (
                  <Chip 
                    size="small" 
                    label="No Tasks" 
                    color="default"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                ) : (
                  <Chip 
                    size="small" 
                    label={`${completedCount}/${totalCount}`}
                    color={completedCount === totalCount ? "success" : "warning"}
                    sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 2, backgroundColor: '#fff' }}>
            {hasNoTasks ? (
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 2,
                textAlign: 'center'
              }}>
                <DoNotDisturbIcon color="disabled" sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {notes || "Didn't do anything"}
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                  Tasks:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {tasks.map((task, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        p: 1,
                        backgroundColor: task.completed ? '#e8f5e9' : '#ffebee',
                        borderRadius: 1
                      }}
                    >
                      {task.completed ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: '1.2rem' }} />
                      ) : (
                        <CancelIcon color="error" sx={{ mr: 1, fontSize: '1.2rem' }} />
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ wordBreak: 'break-word' }}
                      >
                        {task.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
            
            {notes && notes !== "Didn't do anything" && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <NotesIcon color="primary" sx={{ mr: 1, fontSize: '1rem' }} />
                    <Typography variant="body2" fontWeight="bold">
                      Notes:
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f5f5f5',
                      p: 1.5,
                      borderRadius: 1
                    }}
                  >
                    {notes}
                  </Typography>
                </Box>
              </>
            )}
          </AccordionDetails>
        </Accordion>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const displayName = user.displayName || user.email || 'User';

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        pb: 4
      }}
    >
      <Container maxWidth="lg" sx={{ pt: isMobile ? 2 : 4, px: isMobile ? 1 : 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={onBack}
              sx={{ mr: 1 }}
              size={isMobile ? "small" : "medium"}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              component="h1" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#2c3e50'
              }}
            >
              My Records
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={handleMenuClick}
              size="small"
            >
              {user.photoURL ? (
                <Avatar src={user.photoURL} alt={displayName} sx={{ width: 32, height: 32 }} />
              ) : (
                <Avatar sx={{ width: 32, height: 32 }}>
                  {displayName.charAt(0)}
                </Avatar>
              )}
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
            >
              <MenuItem disabled>
                <Typography variant="body2">{displayName}</Typography>
              </MenuItem>
              <MenuItem onClick={() => { auth.signOut(); handleMenuClose(); }}>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Summary Card */}
        <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight="bold">
                  Total Records: {allDays.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Tracking: {days} days
              </Typography>
            </Box>
          </CardContent>
        </Card>
        
        {/* Records View */}
        {allDays.length === 0 ? (
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
            <DoNotDisturbIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Records Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete some tasks to see them here!
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Mobile/Tablet View */}
            {(isMobile || isTablet) && (
              <Box>
                {allDays.map(day => (
                  <MobileDayCard key={day.dayNumber} day={day} />
                ))}
              </Box>
            )}
            
            {/* Desktop View - Table with Scroll */}
            {!isMobile && !isTablet && (
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
                            zIndex: 3,
                            minWidth: '100px'
                          }}
                        >
                          Day
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: '#f5f5f5',
                            minWidth: '80px'
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            fontWeight: 'bold', 
                            backgroundColor: '#f5f5f5',
                            minWidth: '150px'
                          }}
                        >
                          Notes
                        </TableCell>
                        {allTaskTexts.map((taskText, index) => (
                          <TableCell 
                            key={index} 
                            align="center"
                            sx={{ 
                              fontWeight: 'bold', 
                              backgroundColor: '#f5f5f5',
                              minWidth: '120px'
                            }}
                          >
                            <Tooltip title={taskText}>
                              <Box sx={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '120px'
                              }}>
                                {taskText}
                              </Box>
                            </Tooltip>
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
                                <Typography variant="body2" fontWeight="bold">
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
                                <Chip 
                                  size="small" 
                                  label="N/A" 
                                  color="default"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip 
                                  size="small" 
                                  label={calculateCompletedCount(tasks)}
                                  color={tasks.every(t => t.completed) ? "success" : "warning"}
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              <Tooltip title={notes || "No notes"}>
                                <Box 
                                  sx={{ 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '150px'
                                  }}
                                >
                                  <Typography variant="body2">
                                    {notes || '-'}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                            {allTaskTexts.map((taskText, taskIndex) => {
                              const task = tasks.find(t => t.text === taskText);
                              return (
                                <TableCell 
                                  key={taskIndex} 
                                  align="center"
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