import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerData, cart, cartTotal } = body;

        // 1. Limpieza y formateo del número del cliente
        // Quitamos espacios, guiones y símbolos +
        let phoneCliente = customerData.phone.replace(/[\s\-\+]/g, '');

        // Si el cliente puso el número sin el código de país (ej: 223...), le agregamos el 549
        if (phoneCliente.startsWith('2') || phoneCliente.startsWith('1')) {
            phoneCliente = '549' + phoneCliente;
        } else if (phoneCliente.startsWith('54') && !phoneCliente.startsWith('549')) {
            // Si puso 54 pero le faltó el 9 de celular
            phoneCliente = phoneCliente.replace('54', '549');
        }

        const phoneVendedor = customerData.selectedSeller;

        // 2. Armar el mensaje para el DUEÑO / VENDEDOR
        let mensajeVendedor = `*NUEVO PEDIDO DESDE LA WEB* 🛒\n\n`;
        mensajeVendedor += `*Datos del Cliente:*\n`;
        mensajeVendedor += `- Nombre: ${customerData.name}\n`;
        mensajeVendedor += `- Teléfono: ${customerData.phone}\n`;
        if (customerData.notes) mensajeVendedor += `- Observaciones: ${customerData.notes}\n`;

        mensajeVendedor += `\n*Detalle del Pedido:*\n`;
        cart.forEach((item: any, index: number) => {
            mensajeVendedor += `${index + 1}. *${item.name}* x ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-AR')}\n`;
        });
        mensajeVendedor += `\n*TOTAL: $${cartTotal.toLocaleString('es-AR')}*`;

        // 3. Armar el mensaje para el CLIENTE
        let mensajeCliente = `¡Hola ${customerData.name}! 👋\n\n`;
        mensajeCliente += `Recibimos tu pedido correctamente. En breve nos pondremos en contacto con vos desde esta línea para coordinar el pago y la entrega.\n\n`;
        mensajeCliente += `*Tu Resumen:*\n`;
        cart.forEach((item: any, index: number) => {
            mensajeCliente += `- ${item.quantity}x ${item.name}\n`;
        });
        mensajeCliente += `\n*TOTAL A PAGAR: $${cartTotal.toLocaleString('es-AR')}*\n\n`;
        mensajeCliente += `¡Gracias por tu compra!`;

        // 4. URL de tu bot local (El que está corriendo en el puerto 3001)
        const BOT_URL = 'http://localhost:3001/send';

        // 5. Disparar mensaje al Vendedor
        await fetch(BOT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: phoneVendedor,
                message: mensajeVendedor
            })
        });

        // 6. Disparar mensaje al Cliente
        await fetch(BOT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: phoneCliente,
                message: mensajeCliente
            })
        });

        return NextResponse.json({ success: true, message: 'Mensajes enviados con éxito.' });

    } catch (error) {
        console.error('Error procesando el pedido:', error);
        return NextResponse.json(
            { success: false, message: 'Fallo la comunicación con el bot.' },
            { status: 500 }
        );
    }
}