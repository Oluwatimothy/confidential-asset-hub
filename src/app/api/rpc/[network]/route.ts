import { NextRequest, NextResponse } from 'next/server';

const RPC_URLS: Record<string, string> = {
    sepolia: process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    mainnet: process.env.MAINNET_RPC_URL ?? 'https://ethereum-rpc.publicnode.com',
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
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body,
        });

        const data = await response.text();

        return new NextResponse(data, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (err) {
        return NextResponse.json(
            { jsonrpc: '2.0', error: { code: -32603, message: String(err) }, id: null },
            { status: 200 },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}