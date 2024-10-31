import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket, URL } from '../main';
import ImageCarousel from '../components/ImageCarousel';

function Estudio({ usuario }) {

    const [fotos, setFotos] = useState([]);
    const id = useParams().id;

    useEffect(() => {
        socket.emit('estudio', id, (response) => {
            if (response.success) {
                const stringFotos = response.estudio.fotos?.map((foto) => {
                    return `${URL}/${usuario.nombre}${usuario.dni}/${response.estudio.nombre}/${foto}`;
                });
                setFotos(stringFotos);
            } else {
                console.error(response.error);
            }
        });
    }, [id]);

    return <ImageCarousel images={fotos} />

}

export default Estudio;