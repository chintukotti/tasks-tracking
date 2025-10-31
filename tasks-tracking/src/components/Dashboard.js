import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  Badge,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Menu,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import AddTaskIcon from '@mui/icons-material/AddTask';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InfoIcon from '@mui/icons-material/Info';
import NotesIcon from '@mui/icons-material/Notes';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Records from './Records';
import { format, parseISO, isToday, isAfter, addDays, startOfDay, differenceInDays } from 'date-fns';

const Dashboard = ({ user }) => {
  // Set page title
  useEffect(() => {
    document.title = "Task Tracker - Daily Productivity";
  }, []);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [days, setDays] = useState(7);
  const [customDays, setCustomDays] = useState('');
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [completedTasks, setCompletedTasks] = useState({});
  const [stats, setStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [showRecords, setShowRecords] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [openCompleteDayDialog, setOpenCompleteDayDialog] = useState(false);
  const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0 });
  const [dailyNotes, setDailyNotes] = useState('');
  const [dayCompleted, setDayCompleted] = useState(false);
  const [openAutoSubmitSnackbar, setOpenAutoSubmitSnackbar] = useState(false);
  const open = Boolean(anchorEl);

  // Ref for state
  const stateRef = useRef();
  // Update the ref on every render
  useEffect(() => {
    stateRef.current = { 
      lastActiveDate, 
      currentDay, 
      tasks, 
      completedTasks, 
      streak, 
      user,
      dayCompleted,
      dailyNotes
    };
  });

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper function to check if two dates are consecutive
  const areDatesConsecutive = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  // Check if it's a new day (after 12 AM)
  const isNewDay = () => {
    if (!lastActiveDate) return false;
    
    const lastActive = new Date(lastActiveDate);
    const today = new Date();
    
    // Check if today is after the last active date
    return !isToday(lastActive) || isAfter(today, addDays(startOfDay(lastActive), 1));
  };

  // Helper function to get all dates between two dates
  const getDatesBetween = (startDate, endDate) => {
    const dates = [];
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    while (currentDate < endDateObj) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  };

  // Helper function to handle missed days
  const handleMissedDays = async (lastActiveDate, today) => {
    if (!lastActiveDate) return;
    
    const lastActive = new Date(lastActiveDate);
    const todayDate = new Date(today);
    
    // If last active was today, no missed days
    if (lastActive.toDateString() === todayDate.toDateString()) return;
    
    // Get all dates between last active + 1 day and yesterday
    const missedDates = getDatesBetween(
      new Date(lastActive.setDate(lastActive.getDate() + 1)),
      todayDate
    );
    
    if (missedDates.length === 0) return;
    
    try {
      // Get current records
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentRecords = userData.dailyRecords || {};
      let currentDay = userData.currentDay || 1;
      let streak = userData.streak || 0;
      
      // Create records for each missed day
      missedDates.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        currentRecords[dateString] = {
          dayNumber: currentDay,
          tasks: [],
          notes: "Didn't do anything"
        };
        
        // Reset streak for missed days
        streak = 0;
        currentDay += 1;
      });
      
      // Update user data
      await updateDoc(doc(db, 'users', user.uid), {
        currentDay: currentDay,
        streak: streak,
        dailyRecords: currentRecords,
        lastActiveDate: today
      });
      
      // Update local state
      setCurrentDay(currentDay);
      setStreak(streak);
      setLastActiveDate(today);
    } catch (error) {
      console.error("Error handling missed days:", error);
    }
  };

  // Auto-submit function for 11:58 PM
  const autoSubmitDay = async () => {
    const today = getTodayDate();
    const nextDay = currentDay + 1;
    
    // Check if any tasks were completed
    const anyTaskCompleted = tasks.length > 0 && Object.values(completedTasks).some(Boolean);
    
    // Calculate new streak: only increase if all tasks are completed, else reset to 0
    const allTasksCompleted = tasks.length > 0 && tasks.every(task => completedTasks[task.id]);
    const newStreak = allTasksCompleted ? streak + 1 : 0;
    
    // Create day record
    const dayRecord = tasks.map(task => ({
      id: task.id,
      text: task.text,
      completed: completedTasks[task.id] || false,
      completedAt: completedTasks[task.id] ? new Date().toISOString() : null
    }));
    
    // Determine the note: if any task was completed, use the user's note; else, "Didn't do anything"
    const noteForTheDay = anyTaskCompleted ? dailyNotes : "Didn't do anything";
    
    try {
      // Get current records
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentRecords = userData.dailyRecords || {};
      
      // Add the day record to the records with day number
      currentRecords[today] = {
        dayNumber: currentDay,
        tasks: dayRecord,
        notes: noteForTheDay
      };
      
      // Update user data
      await updateDoc(doc(db, 'users', user.uid), { 
        currentDay: nextDay,
        completedTasks: {},
        lastActiveDate: today,
        streak: newStreak,
        dailyRecords: currentRecords,
        dailyNotes: ''
      });
      
      // Update local state
      setCurrentDay(nextDay);
      setStreak(newStreak);
      setCompletedTasks({});
      setLastActiveDate(today);
      setDayCompleted(true);
      setDailyNotes('');
      
      // Show notification
      setOpenAutoSubmitSnackbar(true);
      
      console.log("Day auto-submitted successfully at 11:58 PM");
    } catch (error) {
      console.error("Error auto-submitting day:", error);
    }
  };

  // Auto-submit effect
  useEffect(() => {
    const checkForAutoSubmit = () => {
      const now = new Date();
      
      // Check if it's 11:58 PM and the day hasn't been completed
      if (now.getHours() === 23 && now.getMinutes() === 58 && !dayCompleted) {
        console.log("Auto-submitting day at 11:58 PM...");
        autoSubmitDay();
      }
      
      // Check if it's a new day (after 12 AM) and reset dayCompleted
      if (isNewDay() && dayCompleted) {
        setDayCompleted(false);
      }
    };

    const interval = setInterval(checkForAutoSubmit, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [dayCompleted]);

  // Update streak based on activity
  const updateStreak = async () => {
    const today = getTodayDate();
    
    // First time user
    if (!lastActiveDate) {
      setStreak(1);
      setLastActiveDate(today);
      await updateDoc(doc(db, 'users', user.uid), { 
        streak: 1, 
        lastActiveDate: today 
      });
      return;
    }
    
    // If already active today, don't update streak
    if (lastActiveDate === today) {
      return;
    }
    
    // If active yesterday, increment streak
    if (areDatesConsecutive(lastActiveDate, today)) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setLastActiveDate(today);
      await updateDoc(doc(db, 'users', user.uid), { 
        streak: newStreak, 
        lastActiveDate: today 
      });
    } else {
      // Reset streak if more than one day has passed
      setStreak(1);
      setLastActiveDate(today);
      await updateDoc(doc(db, 'users', user.uid), { 
        streak: 1, 
        lastActiveDate: today 
      });
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDays(userData.days || 7);
          setStreak(userData.streak || 0);
          setLastActiveDate(userData.lastActiveDate || null);
          setCurrentDay(userData.currentDay || 1);
          
          // Handle tasks that might be stored as objects with id and text
          const userTasks = userData.tasks || [];
          const normalizedTasks = userTasks.map(task => {
            if (typeof task === 'object' && task !== null && task.text) {
              return task;
            } else {
              return { id: Date.now().toString(), text: task };
            }
          });
          
          setTasks(normalizedTasks);
          setCompletedTasks(userData.completedTasks || {});
          calculateStats(normalizedTasks, userData.completedTasks || {});
          
          // Load daily notes if available
          if (userData.dailyNotes) {
            setDailyNotes(userData.dailyNotes);
          }
          
          // Check if day is already completed
          const today = getTodayDate();
          if (userData.lastActiveDate === today && userData.currentDay > 1) {
            setDayCompleted(true);
          }
          
          // Handle missed days
          if (userData.lastActiveDate) {
            await handleMissedDays(userData.lastActiveDate, today);
          }
        } else {
          // Create new user document
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            days: 7,
            tasks: [],
            completedTasks: {},
            streak: 0,
            lastActiveDate: null,
            currentDay: 1,
            dailyRecords: {},
            dailyNotes: ''
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  // Save daily notes to Firestore
  useEffect(() => {
    const saveNotes = async () => {
      if (!user) return;
      
      try {
        await updateDoc(doc(db, 'users', user.uid), { 
          dailyNotes: dailyNotes 
        });
      } catch (error) {
        console.error("Error saving daily notes:", error);
      }
    };
    
    // Debounce saving to avoid too many writes
    const timer = setTimeout(saveNotes, 500);
    return () => clearTimeout(timer);
  }, [dailyNotes, user]);

  const calculateStats = (tasksList, completedTasksList) => {
    const total = tasksList.length;
    const completed = Object.values(completedTasksList).filter(Boolean).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    setStats({ total, completed, percentage });
  };

  const handleDaysChange = async (e) => {
    const value = e.target.value;
    
    if (value === 'custom') {
      setIsCustomDays(true);
      return;
    }
    
    setIsCustomDays(false);
    const newDays = parseInt(value);
    setDays(newDays);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { days: newDays });
    } catch (error) {
      console.error("Error updating days:", error);
    }
  };

  const handleCustomDaysSubmit = async () => {
    if (!customDays || isNaN(customDays) || parseInt(customDays) <= 0) {
      alert('Please enter a valid number of days');
      return;
    }
    
    const newDays = parseInt(customDays);
    setDays(newDays);
    setIsCustomDays(false);
    setCustomDays('');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { days: newDays });
    } catch (error) {
      console.error("Error updating days:", error);
    }
  };

  const handleAddTask = async () => {
    if (newTask.trim() === '') return;
    
    const taskText = newTask.trim();
    const taskObj = { id: Date.now().toString(), text: taskText };
    const newTasks = [...tasks, taskObj];
    setTasks(newTasks);
    setNewTask('');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        tasks: newTasks 
      });
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleTaskToggle = async (taskId, index) => {
    const newCompletedTasks = { 
      ...completedTasks, 
      [taskId]: !completedTasks[taskId] 
    };
    
    setCompletedTasks(newCompletedTasks);
    calculateStats(tasks, newCompletedTasks);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        completedTasks: newCompletedTasks 
      });
    } catch (error) {
      console.error("Error updating task completion:", error);
    }
  };

  const handleDeleteTask = async (taskId, index) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    
    const newCompletedTasks = { ...completedTasks };
    delete newCompletedTasks[taskId];
    
    setTasks(newTasks);
    setCompletedTasks(newCompletedTasks);
    calculateStats(newTasks, newCompletedTasks);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        tasks: newTasks,
        completedTasks: newCompletedTasks
      });
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleNotesChange = (e) => {
    setDailyNotes(e.target.value);
  };

  const handleCompleteDayClick = () => {
    // Calculate completion stats
    const completed = Object.values(completedTasks).filter(Boolean).length;
    const total = tasks.length;
    setCompletionStats({ completed, total });
    setOpenCompleteDayDialog(true);
  };

  const handleConfirmCompleteDay = async () => {
    setOpenCompleteDayDialog(false);
    
    const today = getTodayDate();
    
    // Move to next day
    const nextDay = currentDay + 1;
    setCurrentDay(nextDay);
    
    // Check if all tasks were completed
    const allTasksCompleted = tasks.length > 0 && tasks.every(task => completedTasks[task.id]);
    
    // Update streak based on task completion
    if (allTasksCompleted) {
      // Only increase streak if all tasks were completed
      const newStreak = streak + 1;
      setStreak(newStreak);
      await updateDoc(doc(db, 'users', user.uid), { streak: newStreak });
    } else {
      // Reset streak to 0 if any task was not completed
      setStreak(0);
      await updateDoc(doc(db, 'users', user.uid), { streak: 0 });
    }
    
    // Reset completed tasks for the new day
    setCompletedTasks({});
    
    // Update last active date
    setLastActiveDate(today);
    
    // Mark day as completed
    setDayCompleted(true);
    
    try {
      // Get current records
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentRecords = userData.dailyRecords || {};
      
      // Create day record with all tasks and their completion status
      const dayRecord = tasks.map(task => ({
        id: task.id,
        text: task.text,
        completed: completedTasks[task.id] || false,
        completedAt: completedTasks[task.id] ? new Date().toISOString() : null
      }));
      
      // Add the day record to the records with day number
      currentRecords[today] = {
        dayNumber: currentDay, // Store the current day number
        tasks: dayRecord,
        notes: dailyNotes // Save the daily notes
      };
      
      // Update user data
      await updateDoc(doc(db, 'users', user.uid), { 
        currentDay: nextDay,
        completedTasks: {},
        lastActiveDate: today,
        dailyRecords: currentRecords,
        dailyNotes: '' // Reset notes for the new day
      });
      
      // Reset notes for the new day
      setDailyNotes('');
      
      // Show records page after confirming
      setShowRecords(true);
    } catch (error) {
      console.error("Error completing day:", error);
    }
  };

  const handleCancelCompleteDay = () => {
    setOpenCompleteDayDialog(false);
  };

  const handleReset = async () => {
    // Get current user data to determine the day to reset to
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    const currentDayInDb = userData.currentDay || 1;
    
    // Calculate the day to reset to (previous day or 1 if already at day 1)
    const resetDay = Math.max(1, currentDayInDb - 1);
    
    // Reset to the calculated day
    setCurrentDay(resetDay);
    
    // Reset streak
    setStreak(0);
    
    // Reset completed tasks
    setCompletedTasks({});
    
    // Reset daily notes
    setDailyNotes('');
    
    // Reset day completed status
    setDayCompleted(false);
    
    // Update last active date to the previous day (or today if resetting to day 1)
    const today = new Date();
    const previousDay = new Date(today);
    previousDay.setDate(today.getDate() - 1);
    const formattedPreviousDay = previousDay.toISOString().split('T')[0];
    
    setLastActiveDate(formattedPreviousDay);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        currentDay: resetDay,
        streak: 0,
        completedTasks: {},
        lastActiveDate: formattedPreviousDay,
        dailyRecords: {}, // Clear all records
        dailyNotes: '' // Reset notes
      });
    } catch (error) {
      console.error("Error resetting:", error);
    }
  };

  const handleResetClick = () => {
    setOpenResetDialog(true);
  };

  const handleResetConfirm = () => {
    setOpenResetDialog(false);
    handleReset();
  };

  const handleResetCancel = () => {
    setOpenResetDialog(false);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleCloseAutoSubmitSnackbar = () => {
    setOpenAutoSubmitSnackbar(false);
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          animation: 'gradient 15s ease infinite',
          backgroundSize: '200% 200%',
          pb: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
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
        <Backdrop
          sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
      </Box>
    );
  }

  // Ensure we have a string for display name
  const displayName = user.displayName || user.email || 'User';

  // Calculate if all tasks are completed
  const allTasksCompleted = tasks.length > 0 && tasks.every(task => completedTasks[task.id]);

  // Check if we're on Day 1 (allowing task management)
  const isDayOne = currentDay === 1;

  // Get today's date for display
  const todayDate = new Date();
  const formattedTodayDate = format(todayDate, 'MMMM d, yyyy');

  if (showRecords) {
    return <Records user={user} onBack={() => setShowRecords(false)} />;
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
      
      {/* App Bar */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          {/* My Records button on the left */}
          <Button 
            color="inherit" 
            startIcon={<FormatListBulletedIcon />}
            onClick={() => setShowRecords(true)}
            sx={{ color: '#2c3e50' }}
          >
            My Records
          </Button>
          
          {/* Title in the middle */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'center', color: '#2c3e50', fontWeight: 'bold' }}>
            Task Tracker
          </Typography>
          
          {/* Profile with name and photo on the right */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1, color: '#2c3e50' }}>
              {displayName}
            </Typography>
            <IconButton
              size="small"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuClick}
              color="inherit"
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
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleSignOut}>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ pt: 4 }}>
        {/* Streak and Tracking Duration - Side by side using flexbox */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'row' : 'row',
          gap: 3, 
          mb: 3 
        }}>
          {/* Current Streak Card */}
          <Box sx={{ flex: 1 }}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocalFireDepartmentIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Current Streak
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                  <Badge 
                    badgeContent={streak} 
                    color="error"
                    sx={{ 
                      '& .MuiBadge-badge': { 
                        fontSize: isMobile ? '1.2rem' : '1.5rem', 
                        height: isMobile ? '35px' : '40px', 
                        width: isMobile ? '35px' : '40px', 
                        borderRadius: '50%' 
                      } 
                    }}
                  >
                    <LocalFireDepartmentIcon 
                      color="error" 
                      sx={{ fontSize: isMobile ? '2.5rem' : '3rem' }} 
                    />
                  </Badge>
                </Box>
                <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                  {streak === 0 ? 'Start your streak today!' : `Keep it up! ${streak} day${streak !== 1 ? 's' : ''} in a row`}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          {/* Tracking Duration Card */}
          <Box sx={{ flex: 1 }}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" fontWeight="bold">
                    Tracking Duration
                  </Typography>
                </Box>
                
                {isCustomDays ? (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <TextField
                      fullWidth
                      label="Custom days"
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      inputProps={{ min: 1 }}
                      size={isMobile ? "small" : "medium"}
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleCustomDaysSubmit}
                      size={isMobile ? "small" : "medium"}
                    >
                      Set
                    </Button>
                  </Box>
                ) : (
                  <>
                    <FormControl fullWidth sx={{ mb: 1 }}>
                      <InputLabel id="days-label">Number of days</InputLabel>
                      <Select
                        labelId="days-label"
                        value={days}
                        label="Number of days"
                        onChange={handleDaysChange}
                        size={isMobile ? "small" : "medium"}
                      >
                        <MenuItem value={1}>1 day</MenuItem>
                        <MenuItem value={3}>3 days</MenuItem>
                        <MenuItem value={5}>5 days</MenuItem>
                        <MenuItem value={7}>7 days</MenuItem>
                        <MenuItem value={14}>14 days</MenuItem>
                        <MenuItem value={21}>21 days</MenuItem>
                        <MenuItem value={30}>30 days</MenuItem>
                        <MenuItem value={60}>60 days</MenuItem>
                        <MenuItem value={90}>90 days</MenuItem>
                        <MenuItem value="custom">Custom...</MenuItem>
                      </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary">
                      Currently tracking for {days} day{days !== 1 ? 's' : ''}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
        
        {/* Current Day Card - Full width */}
        <Card elevation={3} sx={{ borderRadius: 3, mb: 4 }}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarTodayIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Current Day
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {formattedTodayDate}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <Typography variant="h3" fontWeight="bold" color="primary">
                Day {currentDay} of {days}
              </Typography>
            </Box>
            
            <Typography variant="body2" align="center" sx={{ mt: 1 }}>
              {currentDay >= days ? "Final day of your tracking period!" : `${days - currentDay} day${days - currentDay !== 1 ? 's' : ''} remaining`}
            </Typography>
            
            {/* Day completed message */}
            {dayCompleted && (
              <Box sx={{ 
                mt: 2, 
                p: 2, 
                backgroundColor: '#e8f5e9', 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body1" fontWeight="bold">
                  Day completed! Come back tomorrow.
                </Typography>
              </Box>
            )}
            
            {/* Time until next day message */}
            {!dayCompleted && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Complete your tasks before 11:58 PM or they will be automatically submitted
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        
        {/* Add New Task Section - Only visible on Day 1 and when day is not completed */}
        {isDayOne && !dayCompleted && (
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Add New Tasks
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
              <TextField
                fullWidth
                label="Task description"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                size={isMobile ? "small" : "medium"}
              />
              <Button 
                variant="contained" 
                startIcon={<AddTaskIcon />}
                onClick={handleAddTask}
                sx={{ px: 3, width: isMobile ? '100%' : 'auto' }}
                size={isMobile ? "small" : "medium"}
              >
                Add
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Your Tasks Section - Only visible when day is not completed */}
        {!dayCompleted && (
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 4, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Your Tasks
            </Typography>
            {tasks.length === 0 ? (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {isDayOne ? "No tasks yet. Add some tasks to get started!" : "No tasks available. Reset to add new tasks."}
                </Typography>
                {!isDayOne && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                    <InfoIcon fontSize="small" sx={{ mr: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Tasks can only be added on Day 1
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <List>
                {tasks.map((task, index) => (
                  <div key={task.id || index}>
                    <ListItem
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteTask(task.id, index)}
                          disabled={!isDayOne}
                          size={isMobile ? "small" : "medium"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!completedTasks[task.id]}
                            onChange={() => handleTaskToggle(task.id, index)}
                            size={isMobile ? "small" : "medium"}
                          />
                        }
                        label={
                          <Typography 
                            variant="body1"
                            sx={{ 
                              textDecoration: completedTasks[task.id] ? 'line-through' : 'none',
                              color: completedTasks[task.id] ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {task.text}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < tasks.length - 1 && <Divider />}
                  </div>
                ))}
              </List>
            )}
          </Paper>
        )}
        
        {/* Daily Notes Section - Only visible when day is not completed */}
        {!dayCompleted && (
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <NotesIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Daily Notes
              </Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Write your thoughts, memories, or moments from today..."
              value={dailyNotes}
              onChange={handleNotesChange}
              size={isMobile ? "small" : "medium"}
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Your notes will be saved with today's record when you complete the day.
            </Typography>
          </Paper>
        )}
        
        {/* Complete and Reset Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handleCompleteDayClick}
            disabled={dayCompleted}
            sx={{ px: 4, width: isMobile ? '100%' : 'auto' }}
            size={isMobile ? "small" : "medium"}
          >
            Complete Day
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<RestartAltIcon />}
            onClick={handleResetClick}
            sx={{ px: 4, width: isMobile ? '100%' : 'auto' }}
            size={isMobile ? "small" : "medium"}
          >
            Reset
          </Button>
        </Box>
        
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: isMobile ? 2 : 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Statistics
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Progress: {stats.completed} of {stats.total} tasks completed
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={stats.percentage} 
              sx={{ height: 10, borderRadius: 5, mb: 2 }}
            />
            <Typography variant="body2" align="center">
              {stats.percentage}% Complete
            </Typography>
          </CardContent>
        </Card>
      </Container>
      
      {/* Reset Confirmation Dialog */}
      <Dialog
        open={openResetDialog}
        onClose={handleResetCancel}
        aria-labelledby="reset-dialog-title"
        aria-describedby="reset-dialog-description"
      >
        <DialogTitle id="reset-dialog-title">
          Reset Tracking
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-dialog-description">
            Are you sure you want to reset your tracking? This will take you back to the previous day, reset your streak, and delete all records. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetCancel}>Cancel</Button>
          <Button onClick={handleResetConfirm} color="error" autoFocus>
            Reset
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Complete Day Confirmation Dialog */}
      <Dialog
        open={openCompleteDayDialog}
        onClose={handleCancelCompleteDay}
        aria-labelledby="complete-day-dialog-title"
        aria-describedby="complete-day-dialog-description"
      >
        <DialogTitle id="complete-day-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
          <EmojiEventsIcon color="success" sx={{ mr: 1 }} />
          Day Completed!
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="complete-day-dialog-description">
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                You have completed <strong>{completionStats.completed}/{completionStats.total}</strong> tasks.
              </Typography>
            </Box>
            <Box sx={{ 
              p: 2, 
              backgroundColor: '#e8f5e9', 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}>
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="body1">
                Day completed successfully!
              </Typography>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCompleteDay}>Cancel</Button>
          <Button onClick={handleConfirmCompleteDay} color="success" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Auto-Submit Snackbar */}
      <Snackbar
        open={openAutoSubmitSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseAutoSubmitSnackbar}
      >
        <Alert onClose={handleCloseAutoSubmitSnackbar} severity="info" sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccessTimeIcon sx={{ mr: 1 }} />
            Your day has been automatically submitted at 11:58 PM
          </Box>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;