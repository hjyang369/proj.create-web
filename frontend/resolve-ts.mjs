export async function resolve(specifier, context, nextResolve) {
  const isRelative =
    specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[a-z]+$/i.test(specifier);

  if (isRelative && !hasExtension) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  }

  return nextResolve(specifier, context);
}
