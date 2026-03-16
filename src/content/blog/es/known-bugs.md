---
title: "Errores Conocidos del Juego"
description: "Presentando la función de errores conocidos——qué es, cómo usarla, y una nota sobre cómo reportarlos y verlos en perspectiva"
date: "2026-03-13"
author: "Araiak"
locale: "es"
tags: ["anuncio", "errores"]
---

He añadido una función de errores conocidos al sitio. Esta es una publicación rápida para explicar qué es, cómo funciona y qué esperar de ella.

> **Nota:** El análisis de errores se basa en las descripciones de cartas en inglés. Cuando la función está activada, los detalles de los errores en las páginas de cartas aparecen solo en inglés.

---

## Qué Es

El sitio ahora rastrea errores que he encontrado en los datos del juego——cosas que no cuadran entre lo que dice la descripción de una carta y lo que los datos subyacentes realmente hacen. Algunos se basan en observaciones de jugadores, y otros se encontraron durante análisis de datos que la mayoría de los jugadores no tendrían forma de detectar.

Actualmente hay **51 errores abiertos** rastreados en la base de datos. Caen en dos categorías:

- **Rojo** — con impacto en el gameplay. La carta se comporta realmente diferente a lo descrito de una manera que afecta cómo la usarías. Ejemplos: apuntado incorrecto, valores de estadísticas incorrectos, habilidades que no se acumulan pero no lo dicen, cartas que se acercan al rango cuerpo a cuerpo a pesar de ser tipo a distancia.
- **Amarillo** — discrepancia en la descripción. El número o efecto en la descripción no coincide con los datos, pero el impacto práctico es menor. Como "la descripción dice 25%, los datos dicen 20%."

La distinción es algo arbitraria, y personas razonables podrían no estar de acuerdo con algunas clasificaciones. He intentado trazar la línea en si cambia significativamente cómo jugarías o valorarías la carta.

Esta lista no es exhaustiva——es solo lo que ha salido de búsquedas de datos más sistemáticas y cosas de las que me he enterado principalmente a través de la comunidad. Es casi seguro que hay errores que aún no he encontrado o a los que no he llegado.

---

## Es Opcional

Esta función está **desactivada por defecto**. Algunos jugadores no quieren esta información——y eso está completamente bien. Para activarla:

- **Página principal**: marca la casilla "Mostrar Errores". Esto guarda la configuración globalmente.
- **Página de búsqueda/cartas**: las cartas con errores conocidos obtienen un pequeño indicador. Haz clic en la página de la carta para ver los detalles completos.

Incluiré información sobre errores en futuros posts de subastas donde sea relevante——si una carta en la que te piden invertir mochi tiene un error conocido, eso es algo que deberías saber antes de gastar. Donde pueda, dejaré notas de datos en los posts del blog detrás de etiquetas de spoiler para que estén disponibles si las quieres sin interferir, pero no puedo garantizar que sea consistente en posts más antiguos, o que no se me escape algo en el comentario.

---

## Sobre Reportar Errores

Si quieres reportar un error, estoy en el Discord de Otogi Leaks y algunos de los otros comunes——si abres una discusión allí probablemente lo vea y lo investigue si tengo tiempo.

Por favor no reportes estos a los desarrolladores a menos que los hayas verificado tú mismo. Antes de reportar:

1. **Necesitas poseer la carta** — no puedes probar lo que no puedes usar.
2. **Valida el error** — confirma realmente que se comporta de la manera que describe el reporte.

Los desarrolladores están manteniendo un juego en vivo con eventos mensuales, lo cual es mucho trabajo. Recibir una avalancha de 50 reportes de errores no validados——muchos de los cuales pueden resultar ser menores o intencionales——no es un buen día. Si has probado algo y estás seguro de que está mal, ese reporte vale la pena hacerlo. Si te basas en lo que leíste aquí, por favor haz tus propias pruebas primero.

---

## Sobre los Errores en Sí

Muchos de estos parecen vergonzosos en papel, pero crear contenido de juego sin errores es genuinamente difícil, especialmente a esta escala. Otogi tiene un enorme roster de cartas con interacciones de estadísticas complejas, y los desarrolladores son claramente un equipo bastante pequeño que saca un nuevo evento cada mes. Eso es impresionante.

También es bastante claro a partir de los datos que el idioma principal del equipo de desarrollo no es el inglés——lo que significa que las descripciones en inglés son probablemente lo último que se revisa antes de que salga un parche. La mayoría de los errores "visuales" son exactamente ese tipo de problema: una descripción localizada que se desvía ligeramente de los datos subyacentes.

No os cebéis con los devs por esto. Están haciendo mucho con recursos limitados y el juego está en buen lugar.

---

## TL;DR

- Los errores son opcionales a través de la casilla "Mostrar Errores"
- Rojo = impacto en gameplay, Amarillo = discrepancia en descripción
- Valida los errores tú mismo antes de reportarlos a los desarrolladores
- Los devs están haciendo un buen trabajo——estas cosas pasan
