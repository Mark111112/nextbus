'use client';

import React from 'react';
import { Container } from 'react-bootstrap';
import AppNavbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <AppNavbar />
      <Container className="py-4">
        <main>{children}</main>
        <footer className="mt-5 pt-4 text-center text-muted">
          <p>&copy; {new Date().getFullYear()} NextBus</p>
        </footer>
      </Container>
    </>
  );
};

export default Layout; 