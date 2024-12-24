import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../main';
import ImageCarousel from '../components/ImageCarousel';

function Estudio() {
    const [fotos, setFotos] = useState([]);
    const id = useParams().id;

    useEffect(() => {
        socket.emit('estudio', id, (response) => {
            if (response.success) {
                setFotos(response.estudio.fotos); // Usar directamente las URLs devueltas
            } else {
                console.error(response.error);
            }
        });
    }, [id]);

    return <ImageCarousel images={fotos} />;
}

export default Estudio;