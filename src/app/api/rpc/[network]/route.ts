import { NextRequest, NextResponse } from 'next/server';

const RPC_URLS: Record<string, string> = {
    sepolia: process.env.SEPOLIA_RPC_URL ?? 'https://eth-sepolia.public.blastapi.io',
    mainnet: process.env.MAINNET_RPC_URL ?? 'https://eth-mainnet.public.blastapi.io',
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ network: string }> },
) {
    const { network } = await params;
    const rpcUrl = RPC_URLS[network] ?? RPC_URLS.sepolia;

    try {
        const body = await request.text();
        const response = await fetch(rpcUrl, {
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

export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}