import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        // Extract Document ID
        const docIdMatch = url.match(/\/d\/(.*?)(\/|$)/);
        if (!docIdMatch) {
            return NextResponse.json({ error: 'Invalid Google Docs URL' }, { status: 400 });
        }

        const docId = docIdMatch[1];
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

        const response = await fetch(exportUrl, {
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch from Google: ${response.statusText}`);
        }

        const text = await response.text();
        
        return new NextResponse(text, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (error) {
        console.error('Transcript API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch transcript. Ensure the document is public.' }, { status: 500 });
    }
}
