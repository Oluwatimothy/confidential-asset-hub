import { NextRequest, NextResponse } from 'next/server';

const RELAYER_URLS: Record<string, string> = {
    sepolia: 'https://relayer.testnet.zama.org/v2',
    mainnet: 'https://relayer.mainnet.zama.org/v2',
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const { path } = await params;
    const network = path[0] === 'mainnet' ? 'mainnet' : 'sepolia';
    const subPath = path.slice(1).join('/');
    const targetUrl = `${RELAYER_URLS[network]}/${subPath}`;

    try {
        const body = await request.text();
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        const data = await response.text();
        return new NextResponse(data, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const { path } = await params;
    const network = path[0] === 'mainnet' ? 'mainnet' : 'sepolia';
    const subPath = path.slice(1).join('/');
    const targetUrl = `${RELAYER_URLS[network]}/${subPath}`;

    try {
        const response = await fetch(targetUrl);
        const data = await response.text();
        return new NextResponse(data, {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}