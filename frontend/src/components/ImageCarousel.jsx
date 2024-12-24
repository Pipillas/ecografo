import React, { forwardRef, useRef, useState, useEffect } from 'react';
import '../styles/imagecarousel.css';

const ImageWithEffects = forwardRef(({ src, filters, zoom, offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp, dragging, isMobile }, ref) => {
  const filterStyle = {
    filter: `contrast(${filters.Contraste}%) brightness(${filters.Brillo}%) sepia(${filters.Sepia}%) invert(${filters.Invertir}%)`,
    // Solo aplicamos zoom y transformaciones si no es móvil
    ...(isMobile ? {} : {
      transformOrigin: zoom.origin,
      transform: `scale(${zoom.scale}) translate(${offsetX}px, ${offsetY}px)`,
      cursor: zoom.scale > 1 ? 'grabbing' : 'zoom-in',
    })
  };

  if (src && typeof src === 'string' && src.endsWith('.pdf')) {
    return <embed width={'100%'} height={'100%'} src={`${src}#toolbar=0&navpanes=0&scrollbar=0`} type="application/pdf"></embed>;
  }

  return (
    <img
      ref={ref}
      src={src}
      alt="Imagen médica"
      style={filterStyle}
      onMouseDown={!isMobile ? onMouseDown : undefined}
      onMouseMove={!isMobile ? onMouseMove : undefined}
      onMouseUp={!isMobile ? onMouseUp : undefined}
      draggable="false"
      data-dragging={dragging}
    />
  );
});

const QuickAction = ({ icon, label, onClick, active, className }) => (
  <button
    className={`quick-action ${active ? 'active' : ''} ${className || ''}`}
    onClick={onClick}
    title={label}
  >
    <i className={`bi bi-${icon}`}></i>
    <span className="quick-action-label">{label}</span>
  </button>
);

const FilterImage = ({ images }) => {
  // Estados principales
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [filters, setFilters] = useState({
    Contraste: 100,
    Brillo: 100,
    Sepia: 0,
    Invertir: 0,
  });
  const [showFilters, setShowFilters] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Estado para detectar móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Estados para zoom y movimiento (solo desktop)
  const [zoom, setZoom] = useState({ scale: 1, originX: 0, originY: 0 });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  // Estados para swipe en móvil
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Referencias
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Manejo de swipe para móvil
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      navigateImages(1);
    }
    if (isRightSwipe && currentImageIndex > 0) {
      navigateImages(-1);
    }
  };

  const handleKeyPress = (event) => {
    switch (event.key) {
      case 'ArrowLeft':
        navigateImages(-1);
        break;
      case 'ArrowRight':
        navigateImages(1);
        break;
      default:
        break;
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: parseInt(value)
    }));
  };

  const handleWheel = (event) => {
    if (isMobile) return;

    const deltaY = event.deltaY;
    const scaleChange = deltaY > 0 ? 0.9 : 1.1;
    let newScale = zoom.scale * scaleChange;

    if (newScale < 1) newScale = 1;
    if (newScale > 4) newScale = 4;

    if (newScale === 1) {
      setOffsetX(0);
      setOffsetY(0);
      setZoom({
        scale: 1,
        originX: 0,
        originY: 0
      });
      return;
    }

    const boundingRect = imageRef.current.getBoundingClientRect();
    const mouseX = event.clientX - boundingRect.left;
    const mouseY = event.clientY - boundingRect.top;

    setZoom({
      scale: newScale,
      originX: ((mouseX / boundingRect.width) * 100).toFixed(2),
      originY: ((mouseY / boundingRect.height) * 100).toFixed(2)
    });
  };

  // Solo para desktop
  const handleMouseDown = (event) => {
    if (isMobile || zoom.scale === 1) return;
    event.preventDefault();
    setDragging(true);
    setStartX(event.clientX);
    setStartY(event.clientY);
  };

  const handleMouseMove = (event) => {
    if (!dragging || isMobile) return;
    event.preventDefault();

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    setOffsetX(prev => prev + (deltaX / zoom.scale));
    setOffsetY(prev => prev + (deltaY / zoom.scale));
    setStartX(event.clientX);
    setStartY(event.clientY);
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const resetImage = () => {
    setFilters({
      Contraste: 100,
      Brillo: 100,
      Sepia: 0,
      Invertir: 0,
    });
    setZoom({ scale: 1, originX: 0, originY: 0 });
    setOffsetX(0);
    setOffsetY(0);
  };

  const toggleFullscreen = () => {
    if (!isMobile) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const navigateImages = (direction) => {
    const newIndex = currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < images.length) {
      setCurrentImageIndex(newIndex);
      resetImage();
    }
  };

  return (
    <div
      className={`viewer-container ${!showFilters ? 'filters-hidden' : ''} ${!showThumbnails ? 'thumbnails-hidden' : ''}`}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyPress}
    >
      {!isMobile && (
        <div className="quick-actions-bar">
          <div className="quick-actions-left">
            <QuickAction
              icon="arrows-fullscreen"
              label="Fullscreen"
              onClick={toggleFullscreen}
              active={isFullscreen}
            />
            <QuickAction
              icon="sliders"
              label="Filtros"
              onClick={() => setShowFilters(!showFilters)}
              active={showFilters}
            />
            <QuickAction
              icon="images"
              label="Miniaturas"
              onClick={() => setShowThumbnails(!showThumbnails)}
              active={showThumbnails}
            />
          </div>

          <div className="image-navigation">
            <button
              className="nav-button"
              onClick={() => navigateImages(-1)}
              disabled={currentImageIndex === 0}
              title="Imagen anterior"
            >
              ←
            </button>
            <span className="image-counter">
              {currentImageIndex + 1} / {images.length}
            </span>
            <button
              className="nav-button"
              onClick={() => navigateImages(1)}
              disabled={currentImageIndex === images.length - 1}
              title="Siguiente imagen"
            >
              →
            </button>
          </div>

          <div className="quick-actions-right">
            <QuickAction
              icon="arrow-counterclockwise"
              label="Reset"
              onClick={resetImage}
            />
          </div>
        </div>
      )}

      <div className="main-content">
        {showFilters && (
          <div className="filters-panel">
            {Object.entries(filters).map(([filterName, value]) => (
              <div className="filter-control" key={filterName}>
                <div className="filter-header">
                  <label htmlFor={`${filterName}Slider`}>{filterName}</label>
                  <span className="filter-value">{value}%</span>
                </div>
                <input
                  type="range"
                  id={`${filterName}Slider`}
                  className="filter-slider"
                  min={(filterName === 'Sepia') || (filterName === 'Invertir') ? '0' : '50'}
                  max={filterName === 'Invertir' ? "100" : "200"}
                  step={filterName === 'Invertir' ? "100" : "1"}
                  value={value}
                  onChange={(e) => handleFilterChange(filterName, e.target.value)}
                />
              </div>
            ))}
            <button
              className="reset-button"
              onClick={resetImage}
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              <span>Restablecer ajustes</span>
            </button>
          </div>
        )}

        <div
          className={`image-workspace ${dragging ? 'dragging' : ''}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <ImageWithEffects
            src={images[currentImageIndex]}
            filters={filters}
            zoom={zoom}
            offsetX={offsetX}
            offsetY={offsetY}
            ref={imageRef}
            dragging={dragging}
            isMobile={isMobile}
          />
          {isMobile && (
            <div className="mobile-swipe-hint">
              Desliza para cambiar de imagen
            </div>
          )}
        </div>
      </div>
      {showThumbnails && (
        <div className="thumbnails-panel">
          <div className="thumbnails-scroll">
            {images.map((image, index) => {
              // Verificar si es un PDF
              if (typeof image === 'string' && image.endsWith('.pdf')) {
                return (
                  <div
                    key={index}
                    className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                    onClick={() => setCurrentImageIndex(index)}
                    title={`PDF ${index + 1}`}
                  >
                    <embed src={`${image}#toolbar=0&navpanes=0&scrollbar=0`} type="application/pdf" width="100" height="75" />
                    <div className="thumbnail-number">{index + 1}</div>
                  </div>
                );
              }
              return (
                <div
                  key={index}
                  className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                  title={`Imagen ${index + 1}`}
                >
                  <img src={image} alt={`Thumbnail ${index + 1}`} />
                  <div className="thumbnail-number">{index + 1}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* {showThumbnails && (
        <div className="thumbnails-panel">
          <div className="thumbnails-scroll">
            {images.map((image, index) => (
              <div
                key={index}
                className={`thumbnail ${currentImageIndex === index ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
                title={`Imagen ${index + 1}`}
              >
                <img src={image} alt={`Thumbnail ${index + 1}`} />
                <div className="thumbnail-number">{index + 1}</div>
              </div>
            ))}
          </div>
        </div>
      )} */}

    </div>
  );
};

export default FilterImage;