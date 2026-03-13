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
import CloudOffIcon from '@mui/icons-material/CloudOff';
import Records from './Records';
import { format } from 'date-fns';

const STORAGE_KEY = 'taskTrackerPendingData';

const Dashboard = ({ user }) => {
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
  const [trackingCompleted, setTrackingCompleted] = useState(false);
  const [autoSubmitMessage, setAutoSubmitMessage] = useState('');
  const open = Boolean(anchorEl);

  const predefinedDays = [1, 3, 5, 7, 14, 21, 30, 60, 90];
  const isCustomValue = !predefinedDays.includes(days);

  const stateRef = useRef();
  useEffect(() => {
    stateRef.current = { 
      lastActiveDate, 
      currentDay, 
      tasks, 
      completedTasks, 
      streak, 
      user,
      dayCompleted,
      dailyNotes,
      days
    };
  });

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const areDatesConsecutive = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

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

  // ==================== LOCAL STORAGE FUNCTIONS ====================
  
  // Save current progress to localStorage
  const saveToLocalStorage = (data) => {
    try {
      const today = getTodayDate();
      const dataToSave = {
        date: today,
        currentDay: data.currentDay,
        completedTasks: data.completedTasks,
        dailyNotes: data.dailyNotes,
        tasks: data.tasks,
        streak: data.streak,
        days: data.days,
        userId: user.uid
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  // Clear localStorage
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  };

  // Check and submit pending data from previous day
  const checkAndSubmitPendingData = async (currentUserData) => {
    try {
      const pendingDataStr = localStorage.getItem(STORAGE_KEY);
      if (!pendingDataStr) return null;
      
      const pendingData = JSON.parse(pendingDataStr);
      const today = getTodayDate();
      
      // Verify it's for the same user
      if (pendingData.userId !== user.uid) {
        clearLocalStorage();
        return null;
      }
      
      // If the stored date is not today, we have pending data from a previous day
      if (pendingData.date && pendingData.date !== today && pendingData.date !== currentUserData.lastActiveDate) {
        const { date, currentDay: pendingCurrentDay, completedTasks: pendingCompletedTasks, dailyNotes: pendingNotes, tasks: pendingTasks, streak: pendingStreak, days: pendingDays } = pendingData;
        
        // Don't process if already exceeded tracking days
        if (pendingCurrentDay > pendingDays) {
          clearLocalStorage();
          return null;
        }
        
        // Check if this day was already recorded
        const existingRecords = currentUserData.dailyRecords || {};
        if (existingRecords[date]) {
          clearLocalStorage();
          return null;
        }
        
        // Create day record
        const dayRecord = pendingTasks.map(task => ({
          id: task.id,
          text: task.text,
          completed: pendingCompletedTasks[task.id] || false,
          completedAt: pendingCompletedTasks[task.id] ? new Date(date + 'T23:58:00').toISOString() : null
        }));
        
        const anyTaskCompleted = pendingTasks.length > 0 && Object.values(pendingCompletedTasks).some(Boolean);
        const allTasksCompleted = pendingTasks.length > 0 && pendingTasks.every(task => pendingCompletedTasks[task.id]);
        const noteForTheDay = anyTaskCompleted ? (pendingNotes || '') : "Didn't do anything";
        const newStreak = allTasksCompleted ? pendingStreak + 1 : 0;
        
        return {
          date,
          currentDay: pendingCurrentDay,
          dayRecord,
          noteForTheDay,
          newStreak,
          nextDay: pendingCurrentDay + 1,
          pendingDays
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error checking pending data:", error);
      clearLocalStorage();
      return null;
    }
  };

  // Submit pending data to Firebase
  const submitPendingData = async (pendingSubmission, currentRecords) => {
    try {
      const updatedRecords = { ...currentRecords };
      
      // Add the pending day record
      updatedRecords[pendingSubmission.date] = {
        dayNumber: pendingSubmission.currentDay,
        tasks: pendingSubmission.dayRecord,
        notes: pendingSubmission.noteForTheDay
      };
      
      // Update Firebase
      await updateDoc(doc(db, 'users', user.uid), {
        dailyRecords: updatedRecords,
        streak: pendingSubmission.newStreak,
        currentDay: pendingSubmission.nextDay,
        completedTasks: {},
        dailyNotes: '',
        lastActiveDate: pendingSubmission.date
      });
      
      // Clear localStorage after successful submission
      clearLocalStorage();
      
      // Show notification
      const completedCount = pendingSubmission.dayRecord.filter(t => t.completed).length;
      const totalCount = pendingSubmission.dayRecord.length;
      setAutoSubmitMessage(`Day ${pendingSubmission.currentDay} auto-submitted (${completedCount}/${totalCount} tasks completed)`);
      setOpenAutoSubmitSnackbar(true);
      
      return {
        newStreak: pendingSubmission.newStreak,
        nextDay: pendingSubmission.nextDay,
        updatedRecords
      };
    } catch (error) {
      console.error("Error submitting pending data:", error);
      return null;
    }
  };

  // ==================== END LOCAL STORAGE FUNCTIONS ====================

  const handleMissedDays = async (lastActiveDate, today, userData, startDay) => {
    if (!lastActiveDate) return userData;
    
    const lastActive = new Date(lastActiveDate);
    const todayDate = new Date(today);
    
    if (lastActive.toDateString() === todayDate.toDateString()) return userData;
    
    const missedDates = getDatesBetween(
      new Date(lastActive.setDate(lastActive.getDate() + 1)),
      todayDate
    );
    
    if (missedDates.length === 0) return userData;
    
    try {
      const currentRecords = userData.dailyRecords || {};
      let updatedCurrentDay = startDay;
      let updatedStreak = userData.streak || 0;
      const trackingDays = userData.days || 7;
      
      missedDates.forEach(date => {
        if (updatedCurrentDay > trackingDays) return;
        
        const dateString = date.toISOString().split('T')[0];
        
        // Don't overwrite existing records
        if (!currentRecords[dateString]) {
          currentRecords[dateString] = {
            dayNumber: updatedCurrentDay,
            tasks: [],
            notes: "Didn't do anything"
          };
          updatedStreak = 0;
          updatedCurrentDay += 1;
        }
      });
      
      await updateDoc(doc(db, 'users', user.uid), {
        currentDay: updatedCurrentDay,
        streak: updatedStreak,
        dailyRecords: currentRecords,
        lastActiveDate: today
      });
      
      return {
        ...userData,
        currentDay: updatedCurrentDay,
        streak: updatedStreak,
        dailyRecords: currentRecords,
        lastActiveDate: today
      };
    } catch (error) {
      console.error("Error handling missed days:", error);
      return userData;
    }
  };

  const autoSubmitDay = async () => {
    const state = stateRef.current;
    if (!state || state.dayCompleted) return;
    
    const today = getTodayDate();
    const { tasks, completedTasks, currentDay, streak, dailyNotes, days } = state;
    
    if (currentDay > days) return;
    
    const nextDay = currentDay + 1;
    const anyTaskCompleted = tasks.length > 0 && Object.values(completedTasks).some(Boolean);
    const allTasksCompleted = tasks.length > 0 && tasks.every(task => completedTasks[task.id]);
    const newStreak = allTasksCompleted ? streak + 1 : 0;
    
    const dayRecord = tasks.map(task => ({
      id: task.id,
      text: task.text,
      completed: completedTasks[task.id] || false,
      completedAt: completedTasks[task.id] ? new Date().toISOString() : null
    }));
    
    const noteForTheDay = anyTaskCompleted ? dailyNotes : "Didn't do anything";
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentRecords = userData.dailyRecords || {};
      
      currentRecords[today] = {
        dayNumber: currentDay,
        tasks: dayRecord,
        notes: noteForTheDay
      };
      
      await updateDoc(doc(db, 'users', user.uid), { 
        currentDay: nextDay,
        completedTasks: {},
        lastActiveDate: today,
        streak: newStreak,
        dailyRecords: currentRecords,
        dailyNotes: ''
      });
      
      // Clear localStorage after successful online submission
      clearLocalStorage();
      
      setCurrentDay(nextDay);
      setStreak(newStreak);
      setCompletedTasks({});
      setLastActiveDate(today);
      setDayCompleted(true);
      setDailyNotes('');
      setStats({ total: tasks.length, completed: 0, percentage: 0 });
      
      if (nextDay > days) {
        setTrackingCompleted(true);
      }
      
      setAutoSubmitMessage('Day auto-submitted at 11:58 PM');
      setOpenAutoSubmitSnackbar(true);
    } catch (error) {
      console.error("Error auto-submitting day:", error);
      // If online submission fails, data is already in localStorage
      // It will be submitted when user comes back online
    }
  };

  useEffect(() => {
    const checkForAutoSubmit = () => {
      const now = new Date();
      const state = stateRef.current;
      
      if (now.getHours() === 23 && now.getMinutes() === 58 && state && !state.dayCompleted) {
        autoSubmitDay();
      }
    };

    const interval = setInterval(checkForAutoSubmit, 60000);
    checkForAutoSubmit();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkNewDay = () => {
      const today = getTodayDate();
      if (lastActiveDate && lastActiveDate !== today && dayCompleted) {
        setDayCompleted(false);
      }
    };

    const interval = setInterval(checkNewDay, 60000);
    checkNewDay();

    return () => clearInterval(interval);
  }, [lastActiveDate, dayCompleted]);

  // Save to localStorage whenever relevant state changes
  useEffect(() => {
    if (!loading && user && !dayCompleted && !trackingCompleted && tasks.length > 0) {
      saveToLocalStorage({
        currentDay,
        completedTasks,
        dailyNotes,
        tasks,
        streak,
        days
      });
    }
  }, [completedTasks, dailyNotes, tasks, currentDay, streak, days, loading, user, dayCompleted, trackingCompleted]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const today = getTodayDate();
        
        if (userDoc.exists()) {
          let userData = userDoc.data();
          
          // Check for pending data from localStorage (offline auto-submit)
          const pendingSubmission = await checkAndSubmitPendingData(userData);
          
          if (pendingSubmission) {
            // Submit the pending data first
            const result = await submitPendingData(pendingSubmission, userData.dailyRecords || {});
            
            if (result) {
              userData = {
                ...userData,
                streak: result.newStreak,
                currentDay: result.nextDay,
                dailyRecords: result.updatedRecords,
                completedTasks: {},
                dailyNotes: '',
                lastActiveDate: pendingSubmission.date
              };
            }
          }
          
          // Handle missed days (days between last active and today)
          if (userData.lastActiveDate && userData.lastActiveDate !== today) {
            userData = await handleMissedDays(userData.lastActiveDate, today, userData, userData.currentDay);
          }
          
          setDays(userData.days || 7);
          setStreak(userData.streak || 0);
          setLastActiveDate(userData.lastActiveDate || null);
          setCurrentDay(userData.currentDay || 1);
          
          if ((userData.currentDay || 1) > (userData.days || 7)) {
            setTrackingCompleted(true);
          }
          
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
          
          if (userData.dailyNotes) {
            setDailyNotes(userData.dailyNotes);
          }
          
          const dailyRecords = userData.dailyRecords || {};
          if (dailyRecords[today]) {
            setDayCompleted(true);
            clearLocalStorage(); // Clear storage if day is already completed
          } else {
            setDayCompleted(false);
          }
          
        } else {
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
          clearLocalStorage();
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const saveNotes = async () => {
      if (!user || dayCompleted) return;
      
      try {
        await updateDoc(doc(db, 'users', user.uid), { 
          dailyNotes: dailyNotes 
        });
      } catch (error) {
        console.error("Error saving daily notes:", error);
      }
    };
    
    const timer = setTimeout(saveNotes, 500);
    return () => clearTimeout(timer);
  }, [dailyNotes, user, dayCompleted]);

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
    
    if (currentDay > newDays) {
      setTrackingCompleted(true);
    } else {
      setTrackingCompleted(false);
    }
    
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
    
    if (currentDay > newDays) {
      setTrackingCompleted(true);
    } else {
      setTrackingCompleted(false);
    }
    
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
    calculateStats(newTasks, completedTasks);
    
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
      // Still saved to localStorage even if Firebase fails
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
    const completed = Object.values(completedTasks).filter(Boolean).length;
    const total = tasks.length;
    setCompletionStats({ completed, total });
    setOpenCompleteDayDialog(true);
  };

  const handleConfirmCompleteDay = async () => {
    setOpenCompleteDayDialog(false);
    
    const today = getTodayDate();
    const nextDay = currentDay + 1;
    setCurrentDay(nextDay);
    
    const allTasksCompleted = tasks.length > 0 && tasks.every(task => completedTasks[task.id]);
    
    let newStreak = streak;
    if (allTasksCompleted) {
      newStreak = streak + 1;
      setStreak(newStreak);
    } else {
      newStreak = 0;
      setStreak(0);
    }
    
    setCompletedTasks({});
    setStats({ total: tasks.length, completed: 0, percentage: 0 });
    setLastActiveDate(today);
    setDayCompleted(true);
    
    // Clear localStorage when day is manually completed
    clearLocalStorage();
    
    if (nextDay > days) {
      setTrackingCompleted(true);
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const currentRecords = userData.dailyRecords || {};
      
      const dayRecord = tasks.map(task => ({
        id: task.id,
        text: task.text,
        completed: completedTasks[task.id] || false,
        completedAt: completedTasks[task.id] ? new Date().toISOString() : null
      }));
      
      currentRecords[today] = {
        dayNumber: currentDay,
        tasks: dayRecord,
        notes: dailyNotes
      };
      
      await updateDoc(doc(db, 'users', user.uid), { 
        currentDay: nextDay,
        completedTasks: {},
        lastActiveDate: today,
        streak: newStreak,
        dailyRecords: currentRecords,
        dailyNotes: ''
      });
      
      setDailyNotes('');
      setShowRecords(true);
    } catch (error) {
      console.error("Error completing day:", error);
    }
  };

  const handleCancelCompleteDay = () => {
    setOpenCompleteDayDialog(false);
  };

  const handleReset = async () => {
    setCurrentDay(1);
    setStreak(0);
    setCompletedTasks({});
    setDailyNotes('');
    setDayCompleted(false);
    setTrackingCompleted(false);
    setLastActiveDate(null);
    setStats({ total: tasks.length, completed: 0, percentage: 0 });
    
    // Clear localStorage on reset
    clearLocalStorage();
    
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        currentDay: 1,
        streak: 0,
        completedTasks: {},
        lastActiveDate: null,
        dailyRecords: {},
        dailyNotes: ''
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
      // Don't clear localStorage on sign out - data should persist
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleCloseAutoSubmitSnackbar = () => {
    setOpenAutoSubmitSnackbar(false);
  };

  const handleStartNewTracking = async () => {
    await handleReset();
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

  const displayName = user.displayName || user.email || 'User';
  const allTasksCompleted = tasks.length > 0 && tasks.every(task => completedTasks[task.id]);
  const isDayOne = currentDay === 1;
  const todayDate = new Date();
  const formattedTodayDate = format(todayDate, 'MMMM d, yyyy');
  const displayDay = Math.min(currentDay, days);

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
        <Toolbar sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Button 
            color="inherit" 
            startIcon={<FormatListBulletedIcon />}
            onClick={() => setShowRecords(true)}
            sx={{ color: '#2c3e50', fontSize: isMobile ? '0.75rem' : '0.875rem' }}
            size={isMobile ? "small" : "medium"}
          >
            {isMobile ? 'Records' : 'My Records'}
          </Button>
          
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              textAlign: 'center', 
              color: '#2c3e50', 
              fontWeight: 'bold',
              display: isMobile ? 'none' : 'block'
            }}
          >
            Task Tracker
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {!isMobile && (
              <Typography variant="body2" sx={{ mr: 1, color: '#2c3e50' }}>
                {displayName}
              </Typography>
            )}
            <IconButton
              size="small"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuClick}
              color="inherit"
            >
              {user.photoURL ? (
                <Avatar 
                  src={user.photoURL} 
                  alt={displayName} 
                  sx={{ width: 32, height: 32 }}
                  imgProps={{ referrerPolicy: "no-referrer" }}
                />
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
              {isMobile && (
                <MenuItem disabled>
                  <Typography variant="body2">{displayName}</Typography>
                </MenuItem>
              )}
              <MenuItem onClick={handleSignOut}>
                <Typography variant="body2">Logout</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ pt: isMobile ? 2 : 4, px: isMobile ? 1 : 3 }}>
        
        {/* Clean Congratulations Card */}
        {trackingCompleted && (
          <Card 
            elevation={3} 
            sx={{ 
              borderRadius: 3, 
              mb: 3, 
              backgroundColor: '#fff',
              overflow: 'hidden'
            }}
          >
            <Box sx={{ height: 6, backgroundColor: '#4caf50' }} />
            <CardContent sx={{ p: isMobile ? 3 : 4, textAlign: 'center' }}>
              <Box 
                sx={{ 
                  width: 70, 
                  height: 70, 
                  borderRadius: '50%', 
                  backgroundColor: '#e8f5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
              
              <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom color="#2c3e50">
                Congratulations!
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                You've completed your {days}-day tracking goal.
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: isMobile ? 3 : 5,
                  mb: 3,
                  py: 2,
                  borderTop: '1px solid #eee',
                  borderBottom: '1px solid #eee'
                }}
              >
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#2196f3">
                    {days}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Days
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#ff9800">
                    {streak}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Streak
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight="bold" color="#4caf50">
                    {tasks.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tasks
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  onClick={() => setShowRecords(true)}
                  sx={{ px: 3 }}
                  size={isMobile ? "medium" : "large"}
                >
                  View Records
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleStartNewTracking}
                  startIcon={<RestartAltIcon />}
                  sx={{ px: 3 }}
                  size={isMobile ? "medium" : "large"}
                >
                  Start New
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
        
        {/* Streak and Tracking Duration */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'row',
          gap: isMobile ? 1 : 3, 
          mb: 3 
        }}>
          {/* Current Streak Card */}
          <Box sx={{ flex: 1 }}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocalFireDepartmentIcon color="error" sx={{ mr: 0.5, fontSize: isMobile ? '1rem' : '1.5rem' }} />
                  <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">
                    {isMobile ? 'Streak' : 'Current Streak'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: isMobile ? 1 : 2 }}>
                  <Badge 
                    badgeContent={streak} 
                    color="error"
                    sx={{ 
                      '& .MuiBadge-badge': { 
                        fontSize: isMobile ? '0.9rem' : '1.5rem', 
                        height: isMobile ? '25px' : '40px', 
                        width: isMobile ? '25px' : '40px', 
                        borderRadius: '50%' 
                      } 
                    }}
                  >
                    <LocalFireDepartmentIcon 
                      color="error" 
                      sx={{ fontSize: isMobile ? '2rem' : '3rem' }} 
                    />
                  </Badge>
                </Box>
                <Typography variant="caption" align="center" sx={{ display: 'block' }}>
                  {streak === 0 ? 'Start your streak!' : `${streak} day${streak !== 1 ? 's' : ''}`}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          
          {/* Tracking Duration Card */}
          <Box sx={{ flex: 1 }}>
            <Card elevation={3} sx={{ height: '100%', borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: isMobile ? 1.5 : 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarTodayIcon color="primary" sx={{ mr: 0.5, fontSize: isMobile ? '1rem' : '1.5rem' }} />
                  <Typography variant={isMobile ? "body2" : "h6"} fontWeight="bold">
                    {isMobile ? 'Duration' : 'Tracking Duration'}
                  </Typography>
                </Box>
                
                {isCustomDays ? (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1, flexDirection: 'column' }}>
                    <TextField
                      fullWidth
                      label="Days"
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      inputProps={{ min: 1 }}
                      size="small"
                    />
                    <Button 
                      variant="contained" 
                      onClick={handleCustomDaysSubmit}
                      size="small"
                      fullWidth
                    >
                      Set
                    </Button>
                  </Box>
                ) : (
                  <>
                    <FormControl fullWidth sx={{ mb: 1 }} size="small">
                      <InputLabel id="days-label">Days</InputLabel>
                      <Select
                        labelId="days-label"
                        value={isCustomValue ? 'custom' : days}
                        label="Days"
                        onChange={handleDaysChange}
                        size="small"
                        renderValue={(selected) => {
                          if (selected === 'custom') {
                            return `${days} days`;
                          }
                          return `${selected} day${selected !== 1 ? 's' : ''}`;
                        }}
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
                    <Typography variant="caption" color="text.secondary">
                      {days} day{days !== 1 ? 's' : ''} total
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
        
        {/* Current Day Card */}
        {!trackingCompleted && (
          <Card elevation={3} sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarTodayIcon color="primary" sx={{ mr: 1, fontSize: isMobile ? '1rem' : '1.5rem' }} />
                <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                  Current Day
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {formattedTodayDate}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: isMobile ? 1 : 2 }}>
                <Typography variant={isMobile ? "h4" : "h3"} fontWeight="bold" color="primary">
                  Day {displayDay} of {days}
                </Typography>
              </Box>
              
              <Typography variant="body2" align="center">
                {currentDay >= days ? "Final day of your tracking period!" : `${days - currentDay} day${days - currentDay !== 1 ? 's' : ''} remaining`}
              </Typography>
              
              {dayCompleted && (
                <Box sx={{ 
                  mt: 2, 
                  p: isMobile ? 1.5 : 2, 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: isMobile ? '1.2rem' : '1.5rem' }} />
                  <Typography variant={isMobile ? "body2" : "body1"} fontWeight="bold">
                    Day completed! Come back tomorrow.
                  </Typography>
                </Box>
              )}
              
              {!dayCompleted && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  mt: 2,
                  p: 1,
                  backgroundColor: '#fff3e0',
                  borderRadius: 1
                }}>
                  <CloudOffIcon fontSize="small" sx={{ mr: 1, color: '#ff9800' }} />
                  <Typography variant="caption" color="text.secondary" align="center">
                    Progress auto-saves locally. Will submit when you return.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Add New Task Section */}
        {isDayOne && !dayCompleted && !trackingCompleted && (
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 3 }}>
            <Typography variant={isMobile ? "body1" : "h6"} gutterBottom fontWeight="bold">
              Add New Tasks
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
              <TextField
                fullWidth
                label="Task description"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                size="small"
              />
              <Button 
                variant="contained" 
                startIcon={<AddTaskIcon />}
                onClick={handleAddTask}
                sx={{ px: 3, width: isMobile ? '100%' : 'auto' }}
                size="small"
              >
                Add
              </Button>
            </Box>
          </Paper>
        )}
        
        {/* Your Tasks Section */}
        {!dayCompleted && !trackingCompleted && (
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 3 }}>
            <Typography variant={isMobile ? "body1" : "h6"} gutterBottom fontWeight="bold">
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
              <List sx={{ py: 0 }}>
                {tasks.map((task, index) => (
                  <div key={task.id || index}>
                    <ListItem
                      sx={{ px: isMobile ? 0 : 2, py: isMobile ? 0.5 : 1 }}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteTask(task.id, index)}
                          disabled={!isDayOne}
                          size="small"
                        >
                          <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
                        </IconButton>
                      }
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={!!completedTasks[task.id]}
                            onChange={() => handleTaskToggle(task.id, index)}
                            size="small"
                          />
                        }
                        label={
                          <Typography 
                            variant="body2"
                            sx={{ 
                              textDecoration: completedTasks[task.id] ? 'line-through' : 'none',
                              color: completedTasks[task.id] ? 'text.secondary' : 'text.primary',
                              wordBreak: 'break-word'
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
        
        {/* Daily Notes Section */}
        {!dayCompleted && !trackingCompleted && (
          <Paper elevation={3} sx={{ p: isMobile ? 2 : 3, mb: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <NotesIcon color="primary" sx={{ mr: 1, fontSize: isMobile ? '1rem' : '1.5rem' }} />
              <Typography variant={isMobile ? "body1" : "h6"} fontWeight="bold">
                Daily Notes
              </Typography>
            </Box>
            <TextField
              fullWidth
              multiline
              rows={isMobile ? 3 : 4}
              placeholder="Write your thoughts, memories, or moments from today..."
              value={dailyNotes}
              onChange={handleNotesChange}
              size="small"
              variant="outlined"
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Your notes will be saved with today's record.
            </Typography>
          </Paper>
        )}
        
        {/* Complete and Reset Buttons */}
        {!trackingCompleted && !dayCompleted && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            <Button 
              variant="contained" 
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleCompleteDayClick}
              sx={{ px: 4 }}
              size={isMobile ? "medium" : "large"}
              fullWidth={isMobile}
            >
              Complete Day
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<RestartAltIcon />}
              onClick={handleResetClick}
              sx={{ px: 4 }}
              size={isMobile ? "medium" : "large"}
              fullWidth={isMobile}
            >
              Reset
            </Button>
          </Box>
        )}
        
        {/* Statistics Card */}
        {!trackingCompleted && !dayCompleted && (
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant={isMobile ? "body1" : "h6"} gutterBottom fontWeight="bold">
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
        )}
        
        {/* Reset Button when day is completed */}
        {!trackingCompleted && dayCompleted && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              color="error"
              startIcon={<RestartAltIcon />}
              onClick={handleResetClick}
              sx={{ px: 4 }}
              size={isMobile ? "medium" : "large"}
            >
              Reset
            </Button>
          </Box>
        )}
      </Container>
      
      {/* Reset Confirmation Dialog */}
      <Dialog
        open={openResetDialog}
        onClose={handleResetCancel}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reset Tracking</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset? This will go back to Day 1, reset your streak, and delete all records. This action cannot be undone.
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
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <EmojiEventsIcon color="success" sx={{ mr: 1 }} />
          Complete Day {currentDay}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1">
                You have completed <strong>{completionStats.completed}/{completionStats.total}</strong> tasks.
              </Typography>
            </Box>
            {completionStats.completed === completionStats.total && completionStats.total > 0 ? (
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#e8f5e9', 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center'
              }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  Great! Your streak will increase!
                </Typography>
              </Box>
            ) : (
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#fff3e0', 
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center'
              }}>
                <InfoIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="body1">
                  Your streak will reset to 0.
                </Typography>
              </Box>
            )}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAutoSubmitSnackbar} severity="info" sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AccessTimeIcon sx={{ mr: 1 }} />
            {autoSubmitMessage}
          </Box>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard; 