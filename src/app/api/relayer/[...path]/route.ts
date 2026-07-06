import { NextRequest, NextResponse } from 'next/server';

const RELAYER_URLS: Record<string, string> = {
    sepolia: 'https://relayer.testnet.zama.org/v2',
    mainnet: 'https://relayer.mainnet.zama.org/v2',
};

// Zama's mainnet Relayer requires an API key (requested via Zama's Mainnet
// Relayer API Access form); the Sepolia testnet relayer does not need one.
// This is read server-side only (never sent to the browser) and attached
// solely on mainnet requests, so Sepolia's existing behavior is untouched.
const ZAMA_MAINNET_RELAYER_API_KEY = process.env.ZAMA_RELAYER_API_KEY;

function relayerHeaders(network: string, base: Record<string, string>) {
    if (network === 'mainnet' && ZAMA_MAINNET_RELAYER_API_KEY) {
        return { ...base, 'x-api-key': ZAMA_MAINNET_RELAYER_API_KEY };
    }
    return base;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
) {
    const { path } = await params;
    const network = path[0] === 'mainnet' ? 'mainnet' : 'sepolia';
    const subPath = path.slice(1).join('/');
    const targetUrl = subPath
        ? `${RELAYER_URLS[network]}/${subPath}`
        : RELAYER_URLS[network];

    try {
        const body = await request.text();
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: relayerHeaders(network, { 'Content-Type': 'application/json' }),
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
    const targetUrl = subPath
        ? `${RELAYER_URLS[network]}/${subPath}`
        : RELAYER_URLS[network];

    try {
        const response = await fetch(targetUrl, {
            headers: relayerHeaders(network, {}),
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

export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}