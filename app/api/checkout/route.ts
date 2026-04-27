import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerData, cart, cartTotal } = body;

        console.log(`Recibido pedido de: ${customerData.name} por $${cartTotal}`);
        console.log(`Debe enviarse WhatsApp a Vendedor: ${customerData.selectedSeller}`);
        console.log(`Debe enviarse WhatsApp a Cliente: ${customerData.phone}`);

        // Simulamos el tiempo de proceso de conexión a la API de WhatsApp
        await new Promise(resolve => setTimeout(resolve, 2000));

        return NextResponse.json({
            success: true,
            message: 'Mensajes enviados con éxito.'
        });

    } catch (error) {
        console.error('Error en el checkout:', error);
        return NextResponse.json(
            { success: false, message: 'Fallo el envío de WhatsApp.' },
            { status: 500 }
        );
    }
}