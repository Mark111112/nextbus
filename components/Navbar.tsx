'use client';

import React, { useState } from 'react';
import { Navbar, Container, Nav, Form, Button } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const AppNavbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Link href="/" passHref legacyBehavior>
          <Navbar.Brand>NextBus</Navbar.Brand>
        </Link>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Link href="/" passHref legacyBehavior>
              <Nav.Link>首页</Nav.Link>
            </Link>
            <Link href="/search" passHref legacyBehavior>
              <Nav.Link>搜索</Nav.Link>
            </Link>
            <Link href="/favorites" passHref legacyBehavior>
              <Nav.Link>收藏</Nav.Link>
            </Link>
          </Nav>
          <Form className="d-flex" onSubmit={handleSearch}>
            <Form.Control
              type="search"
              placeholder="输入关键词搜索..."
              className="me-2"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="outline-success" type="submit">搜索</Button>
          </Form>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppNavbar; 