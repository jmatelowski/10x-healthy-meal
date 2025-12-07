interface RecipeMetadataProps {
  updatedAt: string; // ISO string
}

export default function RecipeMetadata({ updatedAt }: RecipeMetadataProps) {
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400">
      <time dateTime={updatedAt}>Last updated: {formatDate(updatedAt)}</time>
    </div>
  );
}
