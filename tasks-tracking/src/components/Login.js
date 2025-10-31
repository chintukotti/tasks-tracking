import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { Button, Container, Typography, Box, Paper, CircularProgress, Backdrop } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Set page title
  React.useEffect(() => {
    document.title = "Task Tracker - Sign In";
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        pb: 4
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}>
          <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: '400px' }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Task Tracker
            </Typography>
            <Typography variant="body1" align="center" sx={{ mb: 3 }}>
              Sign in to track your daily tasks
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              {loading ? (
                <CircularProgress size={24} color="primary" />
              ) : (
                <Button
                  variant="contained"
                  startIcon={<GoogleIcon />}
                  onClick={handleGoogleSignIn}
                  sx={{ px: 4, py: 1 }}
                >
                  Sign in with Google
                </Button>
              )}
            </Box>
            
            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Paper>
        </Box>
      </Container>
      
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default Login;