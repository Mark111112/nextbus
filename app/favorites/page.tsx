'use client';

import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { getMovieData } from '../../lib/api';
import { Movie } from '../../lib/types';
import { loadFavorites, clearFavorites } from '../../lib/favorites';
import Link from 'next/link';
import Image from 'next/image';

export default function Favorites() {
  const [favorites, setFavorites] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cleared, setCleared] = useState(false);
  
  // Load favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      setError('');
      setCleared(false);
      
      try {
        const favoriteIds = loadFavorites();
        
        if (favoriteIds.length === 0) {
          setFavorites([]);
          setLoading(false);
          return;
        }
        
        const moviePromises = favoriteIds.map(id => getMovieData(id));
        const movies = await Promise.all(moviePromises);
        
        // Filter out null values (movies that couldn't be loaded)
        const validMovies = movies.filter((movie): movie is Movie => movie !== null);
        
        setFavorites(validMovies);
      } catch (error) {
        console.error('Failed to load favorites:', error);
        setError('加载收藏夹失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavorites();
  }, [cleared]);
  
  // Handle clear favorites
  const handleClearFavorites = () => {
    if (window.confirm('确定要清空收藏夹吗？此操作不可撤销。')) {
      clearFavorites();
      setCleared(true);
    }
  };
  
  return (
    <Layout>
      <Container>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>我的收藏</h1>
          
          {favorites.length > 0 && (
            <Button 
              variant="outline-danger" 
              onClick={handleClearFavorites}
            >
              清空收藏夹
            </Button>
          )}
        </div>
        
        {/* Loading and error states */}
        {loading && <p>正在加载收藏夹...</p>}
        
        {error && (
          <Alert variant="danger" className="mb-4">
            {error}
          </Alert>
        )}
        
        {/* No favorites */}
        {!loading && !error && favorites.length === 0 && (
          <Alert variant="info">
            <p className="mb-0">您的收藏夹为空。浏览电影时，点击"收藏"按钮将电影添加到收藏夹。</p>
          </Alert>
        )}
        
        {/* Favorites grid */}
        {favorites.length > 0 && (
          <Row>
            {favorites.map((movie) => (
              <Col key={movie.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
                <Link href={`/movie/${movie.id}`} passHref>
                  <Card className="h-100 movie-card">
                    <div style={{ position: 'relative', height: '280px' }}>
                      <Image
                        src={movie.image_url || '/placeholder.jpg'}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <Card.Body>
                      <Card.Title style={{ fontSize: '0.9rem' }}>
                        {movie.translated_title || movie.title}
                      </Card.Title>
                      <Card.Text>
                        <small className="text-muted">{movie.id}</small>
                        <br />
                        <small className="text-muted">{movie.date}</small>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </Layout>
  );
} 