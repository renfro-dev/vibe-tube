async function test() {
    try {
        console.log('Fetching google.com...');
        const res = await fetch('https://www.google.com');
        console.log('Status:', res.status);
        console.log('✅ Connectivity OK');
    } catch (e) {
        console.error('❌ Connectivity Failed:', e);
    }
}
test();
