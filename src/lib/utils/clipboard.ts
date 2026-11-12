export async function copyTextToClipboard(text: string) {
	if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	fallbackCopyTextToClipboard(text);
}

function fallbackCopyTextToClipboard(text: string) {
	if (typeof document === 'undefined') {
		throw new Error('Clipboard copy is not available.');
	}

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.top = '0';
	textarea.style.left = '0';
	textarea.style.opacity = '0';
	textarea.style.pointerEvents = 'none';

	document.body.append(textarea);

	try {
		textarea.focus();
		textarea.select();
		textarea.setSelectionRange(0, textarea.value.length);
		if (!document.execCommand('copy')) {
			throw new Error('Clipboard copy failed.');
		}
	} finally {
		textarea.remove();
	}
}
