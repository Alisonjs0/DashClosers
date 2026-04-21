import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    console.log('Transcript API request received for URL:', url);

    if (!url || url === 'undefined' || url === 'null') {
        console.error('Transcript API Error: Missing or invalid URL parameter');
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    try {
        // More robust Doc ID extraction
        // Handles: /d/ID/edit, /d/ID/view, /d/ID, etc.
        const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        let docId = docIdMatch ? docIdMatch[1] : null;

        // Se não for link de Doc, mas for link do Tactiq, pode ser que o ID esteja no final
        if (!docId && url.includes('tactiq.io')) {
            const parts = url.split('?')[0].split('/');
            docId = parts[parts.length - 1];
            
            // If it's a Tactiq link, we currently only support it if it's exported to Google Docs
            // or if we have a way to fetch it. For now, let's treat it as a potential Doc ID 
            // but return a better error if it fails.
            console.log('Tactiq link detected, trying to extract ID:', docId);
        }

        if (!docId) {
            console.log('No Google Doc ID found in URL:', url);
            return NextResponse.json({ error: 'Formato de URL inválido. Use um link do Google Docs.' }, { status: 400 });
        }

        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        console.log('Fetching transcript from Google Docs:', exportUrl);

        // Add a timeout to the fetch call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
            const response = await fetch(exportUrl, {
                next: { revalidate: 3600 },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`Google Docs Export Error: ${response.status} ${response.statusText}`);
                if (response.status === 404) {
                    return NextResponse.json({ error: 'Documento não encontrado. Verifique se o ID está correto ou se o documento é público.' }, { status: 404 });
                }
                return NextResponse.json({ error: 'O Google Docs recusou a conexão. Verifique se o documento é público.' }, { status: 403 });
            }

            const text = await response.text();
            console.log(`Successfully fetched transcript (${text.length} chars)`);
            
            return new NextResponse(text, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                },
            });
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.error('Transcript API Error: Timeout fetching from Google Docs');
                return NextResponse.json({ error: 'O Google Docs demorou muito para responder (Timeout).' }, { status: 504 });
            }
            throw fetchError;
        }

    } catch (error) {
        console.error('Transcript API Unexpected Error:', error);
        return NextResponse.json({ 
            error: 'Erro interno ao buscar transcrição.',
            details: error.message 
        }, { status: 500 });
    }

}
