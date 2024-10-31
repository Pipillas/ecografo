import React, { forwardRef, useRef, useState } from 'react';
import '../styles/filterimage.css';

const ImageWithEffects = forwardRef(({ src, filters, zoom, offsetX, offsetY, onMouseDown, onMouseMove, onMouseUp }, ref) => {
  const filterStyle = {
    filter: `contrast(${filters.Contraste}%) brightness(${filters.Brillo}%) sepia(${filters.Sepia}%) invert(${filters.Invertir}%)`,
    transformOrigin: zoom.origin,
    transform: `scale(${zoom.scale}) translate(${offsetX}px, ${offsetY}px)`,
    cursor: 'grab',
  };

  return (
    <img
      ref={ref}
      src={src}
      alt="Imagen con efectos"
      style={filterStyle}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    />
  );
});

const FilterImage = ({ src }) => {
  const [filters, setFilters] = useState({
    Contraste: 100,
    Brillo: 100,
    Sepia: 0,
    Invertir: 0,
  });

  const [zoom, setZoom] = useState({ scale: 1, originX: 0, originY: 0 });
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const imageRef = useRef(null);

  const handleFilterChange = (filterName, event) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: event.target.value
    }));
  };

  const handleWheel = (event) => {
    const deltaY = event.deltaY;
    const scaleChange = deltaY > 0 ? 0.9 : 1.1; // Cambio de zoom ajustado
    let newScale = zoom.scale * scaleChange;
    if (newScale < 1) {
      newScale = 1;
    }
    const boundingRect = imageRef.current.getBoundingClientRect();
    const mouseX = event.clientX - boundingRect.left;
    const mouseY = event.clientY - boundingRect.top;

    const percentX = mouseX / boundingRect.width;
    const percentY = mouseY / boundingRect.height;

    const newOriginX = (percentX * 100).toFixed(2);
    const newOriginY = (percentY * 100).toFixed(2);

    setZoom({ scale: newScale, originX: newOriginX, originY: newOriginY }); // Actualizar el estado del zoom
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    setDragging(true);
    setStartX(event.clientX);
    setStartY(event.clientY);
  };

  const handleMouseMove = (event) => {
    event.preventDefault();
    if (dragging) {
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      const newOffsetX = offsetX + (deltaX / zoom.scale);
      const newOffsetY = offsetY + (deltaY / zoom.scale);

      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
      setStartX(event.clientX);
      setStartY(event.clientY);
    }
  };

  const handleMouseUp = () => {
    event.preventDefault();
    setDragging(false);
  };

  const reloadPage = () => {
    setFilters({
      Contraste: 100,
      Brillo: 100,
      Sepia: 0,
      Invertir: 0,
    });
    setZoom({ scale: 1, originX: 0, originY: 0 });
    setOffsetX(0);
    setOffsetY(0);
    setDragging(false);
    setStartX(0);
    setStartY(0);
  };

  return (
    <div className='contenedor-filter' onWheel={handleWheel}>
      <div className='filtros'>
        <div onClick={reloadPage} className='reset-filter'>
          <i className="bi bi-arrow-repeat"></i>
          <br />
          RESET
        </div>
        {Object.entries(filters).map(([filterName, value]) => (
          <div className='filtro' key={filterName}>
            <label htmlFor={`${filterName}Slider`}>{filterName}</label>
            <input
              className='slider'
              type="range"
              id={`${filterName}Slider`}
              min={(filterName === 'Sepia') || (filterName === 'Invertir') ? '0' : '50'}
              max={filterName === 'Invertir' ? "100" : "200"}
              step={filterName === 'Invertir' ? "100" : "1"}
              value={value}
              onChange={(e) => handleFilterChange(filterName, e)}
              onKeyDown={e => e.preventDefault()}
            />
          </div>
        ))}
      </div>
      <div className='contenedor-filter-image' >
        <ImageWithEffects
          src={src}
          filters={filters}
          zoom={zoom} // Pasar el estado del zoom
          offsetX={offsetX}
          offsetY={offsetY}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          ref={imageRef}
        />
      </div>
    </div>
  );
};

export default FilterImage;
