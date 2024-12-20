import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket, IP } from '../main';
import ImageCarousel from '../components/ImageCarousel';

function Estudio({ usuario }) {

    const [fotos, setFotos] = useState([]);
    const id = useParams().id;

    useEffect(() => {
        socket.emit('estudio', id, (response) => {
            if (response.success) {
                console.log(response);
                const stringFotos = response.estudio.fotos?.map((foto) => {
                    console.log(`${IP}/estudios/${usuario.nombre}${usuario.dni}/${response.estudio.nombre}/${foto}`);
                    return `${IP}/estudios/${usuario.nombre}${usuario.dni}/${response.estudio.nombre}/${foto}`;
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