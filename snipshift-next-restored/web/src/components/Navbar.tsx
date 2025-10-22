'use client';

import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem } from '@mui/material';
import { Menu as MenuIcon, AccountCircle } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
  };

  return (
    <AppBar position="sticky" className="navbar" sx={{ bgcolor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid', borderColor: 'neutral.200' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <Image
              src="/logo.jpg"
              alt="SnipShift Logo"
              width={120}
              height={36}
              className="logo-image"
              style={{ marginRight: '1rem' }}
            />
            <Typography variant="h6" className="navbar-brand" sx={{ color: 'brand.primary', fontWeight: 'bold' }}>
              SnipShift
            </Typography>
          </Link>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
          <Link href="/" className="navbar-link">
            <Typography variant="body1" sx={{ color: 'neutral.700', fontWeight: 'medium' }}>
              Home
            </Typography>
          </Link>
          
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="navbar-link">
                <Typography variant="body1" sx={{ color: 'neutral.700', fontWeight: 'medium' }}>
                  Dashboard
                </Typography>
              </Link>
              
              {user?.role === 'ADMIN' && (
                <Link href="/admin/verifications" className="navbar-link">
                  <Typography variant="body1" sx={{ color: 'neutral.700', fontWeight: 'medium' }}>
                    Admin
                  </Typography>
                </Link>
              )}
              
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
                sx={{ color: 'neutral.700' }}
              >
                <AccountCircle />
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
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleLogout}>
                  <Typography variant="body2">Logout</Typography>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="outlined" className="btn btn-outline btn-sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="contained" className="btn btn-primary btn-sm">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </Box>

        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            size="large"
            aria-label="show more"
            aria-haspopup="true"
            color="inherit"
            sx={{ color: 'neutral.700' }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
