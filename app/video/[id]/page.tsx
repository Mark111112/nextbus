'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Alert } from 'react-bootstrap';
import Layout from '../../../components/Layout';
import { getMovieData, getWatchUrlPrefix } from '../../../lib/api';
import { Movie } from '../../../lib/types';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';

// Dynamic import of ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function VideoPlayer({ params }: { params: { id: string } }) {
  const movieId = params.id;
  
  // State
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [hlsUrl, setHlsUrl] = useState('');
  const [magnetLink, setMagnetLink] = useState('');
  const [playerError, setPlayerError] = useState('');
  
  // Refs
  const playerRef = useRef<any>(null);
  
  // Load movie data and setup video sources
  useEffect(() => {
    const fetchMovieData = async () => {
      setLoading(true);
      setError('');
      
      try {
        const movieData = await getMovieData(movieId);
        
        if (movieData) {
          setMovie(movieData);
          
          // Try to setup HLS URL
          try {
            // In Next.js, we'll use our proxy endpoint for HLS streams
            // This would normally require backend parsing but for demo we use static URL
            setHlsUrl(`/api/proxy?url=${encodeURIComponent(`${getWatchUrlPrefix()}/${movieId}/playlist.m3u8`)}`);
          } catch (error) {
            console.error('Failed to set HLS URL:', error);
          }
          
          // Set direct URL as fallback
          setVideoUrl(`${getWatchUrlPrefix()}/${movieId}`);
          
          // Set magnet link as another fallback
          if (movieData.magnet_links && movieData.magnet_links.length > 0) {
            setMagnetLink(movieData.magnet_links[0].link);
          }
        } else {
          setError(`电影 ${movieId} 不存在`);
        }
      } catch (error) {
        console.error('Failed to load movie:', error);
        setError('加载电影信息失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMovieData();
  }, [movieId]);
  
  // Handle player error
  const handlePlayerError = (error: any) => {
    console.error('Player error:', error);
    setPlayerError('视频播放失败，请尝试直接访问原站或使用磁力链接');
  };
  
  if (loading) {
    return (
      <Layout>
        <Container>
          <p>正在加载视频信息...</p>
        </Container>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
        <Container>
          <Alert variant="danger">{error}</Alert>
        </Container>
      </Layout>
    );
  }
  
  if (!movie) {
    return (
      <Layout>
        <Container>
          <Alert variant="warning">未找到电影信息</Alert>
        </Container>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Container fluid>
        <Row>
          {/* Video player */}
          <Col lg={9} className="mb-4">
            <Card>
              <Card.Body>
                <h1 className="mb-3">{movie.translated_title || movie.title}</h1>
                
                {playerError && (
                  <Alert variant="warning" className="mb-3">
                    {playerError}
                  </Alert>
                )}
                
                <div className="ratio ratio-16x9 mb-3">
                  {hlsUrl ? (
                    <ReactPlayer
                      ref={playerRef}
                      url={hlsUrl}
                      controls={true}
                      width="100%"
                      height="100%"
                      onError={handlePlayerError}
                      config={{
                        file: {
                          forceHLS: true,
                          hlsOptions: {
                            debug: false
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center bg-dark text-white">
                      无法加载视频播放器
                    </div>
                  )}
                </div>
                
                <div className="d-flex flex-wrap gap-2">
                  {videoUrl && (
                    <a 
                      href={videoUrl}
                      className="btn btn-primary" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      前往原站观看
                    </a>
                  )}
                  
                  {magnetLink && (
                    <a 
                      href={magnetLink}
                      className="btn btn-outline-secondary" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      使用磁力链接下载
                    </a>
                  )}
                  
                  <Link 
                    href={`/movie/${movie.id}`}
                    className="btn btn-outline-info"
                  >
                    返回影片详情
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Movie info sidebar */}
          <Col lg={3}>
            <Card>
              <div className="position-relative" style={{ height: '320px' }}>
                <Image
                  src={movie.image_url || '/placeholder.jpg'}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 992px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <Card.Body>
                <h5>{movie.translated_title || movie.title}</h5>
                <p className="text-muted">{movie.id} | {movie.date}</p>
                
                {movie.summary && (
                  <div className="mt-3">
                    <h6>影片简介</h6>
                    <p className="small" style={{ maxHeight: '150px', overflow: 'auto' }}>
                      {movie.translated_summary || movie.summary}
                    </p>
                  </div>
                )}
                
                {movie.actors && movie.actors.length > 0 && (
                  <div className="mt-3">
                    <h6>演员</h6>
                    <div className="d-flex flex-wrap gap-1">
                      {movie.actors.map((actor) => (
                        <Link
                          key={actor.id}
                          href={`/search?type=actor&name=${encodeURIComponent(actor.name)}`}
                          className="badge bg-info text-decoration-none"
                        >
                          {actor.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
} 