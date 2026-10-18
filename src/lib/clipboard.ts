// Report blocked or unavailable clipboard access without claiming a successful copy.
export async function copyText(value: string, clipboard?: Pick<Clipboard, 'writeText'>): Promise<boolean> {
  if (!value || !clipboard) return false;
  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
