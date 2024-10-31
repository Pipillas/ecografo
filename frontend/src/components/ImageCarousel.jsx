import React, { useState, useRef } from 'react';
import '../styles/imagecarousel.css';

const ImageCarousel = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    invert: 0,
    sepia: 0
  });

  // Estados para zoom y pan
  const [zoom, setZoom] = useState({ scale: 1, originX: 0, originY: 0 });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const imageRef = useRef(null);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    resetZoomAndPan();
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    resetZoomAndPan();
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
    resetZoomAndPan();
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Manejo del zoom con la rueda del mouse
  const handleWheel = (event) => {
    event.preventDefault();
    const deltaY = event.deltaY;
    const scaleChange = deltaY > 0 ? 0.9 : 1.1;
    let newScale = zoom.scale * scaleChange;

    // Limitar el zoom mínimo a 1
    if (newScale < 1) {
      newScale = 1;
    }

    // Limitar el zoom máximo a 5
    if (newScale > 5) {
      newScale = 5;
    }

    const boundingRect = imageRef.current.getBoundingClientRect();
    const mouseX = event.clientX - boundingRect.left;
    const mouseY = event.clientY - boundingRect.top;

    const percentX = mouseX / boundingRect.width;
    const percentY = mouseY / boundingRect.height;

    const newOriginX = (percentX * 100).toFixed(2);
    const newOriginY = (percentY * 100).toFixed(2);

    setZoom({
      scale: newScale,
      originX: newOriginX,
      originY: newOriginY
    });
  };

  // Manejo del inicio del arrastre
  const handleMouseDown = (event) => {
    event.preventDefault();
    setDragging(true);
    setStartX(event.clientX);
    setStartY(event.clientY);
  };

  // Manejo del movimiento durante el arrastre
  const handleMouseMove = (event) => {
    event.preventDefault();
    if (dragging) {
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      const newOffsetX = offsetX + (deltaX / zoom.scale);
      const newOffsetY = offsetY + (deltaY / zoom.scale);

      // Limitar el pan dentro de los límites de la imagen
      const boundingRect = imageRef.current.getBoundingClientRect();
      const maxOffset = boundingRect.width * (zoom.scale - 1) / (2 * zoom.scale);

      setOffsetX(Math.min(Math.max(newOffsetX, -maxOffset), maxOffset));
      setOffsetY(Math.min(Math.max(newOffsetY, -maxOffset), maxOffset));
      setStartX(event.clientX);
      setStartY(event.clientY);
    }
  };

  // Manejo del fin del arrastre
  const handleMouseUp = (event) => {
    event.preventDefault();
    setDragging(false);
  };

  // Reset de zoom y pan
  const resetZoomAndPan = () => {
    setZoom({ scale: 1, originX: 0, originY: 0 });
    setOffsetX(0);
    setOffsetY(0);
    setDragging(false);
    setStartX(0);
    setStartY(0);
  };

  // Reset de filtros
  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      invert: 0,
      sepia: 0
    });
  };

  const getFilterStyle = () => {
    return {
      filter: `
        brightness(${filters.brightness}%)
        contrast(${filters.contrast}%)
        invert(${filters.invert}%)
        sepia(${filters.sepia}%)
      `,
      transformOrigin: `${zoom.originX}% ${zoom.originY}%`,
      transform: `scale(${zoom.scale}) translate(${offsetX}px, ${offsetY}px)`,
      cursor: dragging ? 'grabbing' : 'grab',
      transition: dragging ? 'none' : 'transform 0.1s ease-out'
    };
  };

  return (
    <div className="carousel-container">
      <div className="controls-container">
        <div className="filter-controls">
          <div className="filter-control">
            <label>Brillo: {filters.brightness}%</label>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.brightness}
              onChange={(e) => handleFilterChange('brightness', e.target.value)}
            />
          </div>

          <div className="filter-control">
            <label>Contraste: {filters.contrast}%</label>
            <input
              type="range"
              min="0"
              max="200"
              value={filters.contrast}
              onChange={(e) => handleFilterChange('contrast', e.target.value)}
            />
          </div>

          <div className="filter-control">
            <label>Invertir: {filters.invert}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.invert}
              onChange={(e) => handleFilterChange('invert', e.target.value)}
            />
          </div>

          <div className="filter-control">
            <label>Sepia: {filters.sepia}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.sepia}
              onChange={(e) => handleFilterChange('sepia', e.target.value)}
            />
          </div>

          <button className="reset-button" onClick={() => {
            resetFilters();
            resetZoomAndPan();
          }}>
            Reset
          </button>
        </div>
      </div>

      <div
        className="image-container"
        onWheel={handleWheel}
      >
        <img
          ref={imageRef}
          src={images[currentIndex]}
          alt={`Imagen ${currentIndex + 1}`}
          style={getFilterStyle()}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable="false"
        />

        <button className="nav-button prev" onClick={goToPrevious}>
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <button className="nav-button next" onClick={goToNext}>
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>

      <div className="thumbnails-container">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => goToImage(index)}
            className={`thumbnail-button ${index === currentIndex ? 'active' : ''}`}
          >
            <img src={image} alt={`Thumbnail ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;