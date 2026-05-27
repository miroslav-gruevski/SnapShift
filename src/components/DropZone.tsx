import { motion } from "framer-motion";

interface Props {
  isDragging: boolean;
  onBrowse: () => void;
}

export function DropZone({ isDragging, onBrowse }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        animate={{
          borderColor: isDragging ? 'rgba(4,191,203,0.5)' : 'rgba(255,255,255,0.08)',
          backgroundColor: isDragging ? 'rgba(4,191,203,0.06)' : 'transparent',
        }}
        transition={{ duration: 0.2 }}
        style={{
          width: '100%', height: '100%', borderRadius: 16,
          borderWidth: 1.5, borderStyle: 'dashed',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
        }}
      >
        <motion.button
          onClick={onBrowse}
          whileHover={{
            scale: 1.08,
            boxShadow: '0 0 24px rgba(125,44,227,0.2), 0 0 12px rgba(4,191,203,0.15)',
          }}
          whileTap={{ scale: 0.95 }}
          animate={{ scale: isDragging ? 1.1 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card"
          tabIndex={0}
          aria-label="Browse files to convert"
          style={{
            width: 60, height: 60, borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <motion.svg
            animate={{ y: isDragging ? -3 : 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            width="26" height="26" viewBox="0 0 24 24" fill="none"
          >
            <path d="M12 16V3M12 3L7 8M12 3L17 8"
              stroke="#04BFCB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 15V17C3 18.1 3.9 19 5 19H19C20.1 19 21 18.1 21 17V15"
              stroke="#04BFCB" strokeWidth="1.8" strokeLinecap="round" />
          </motion.svg>
        </motion.button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 500, opacity: 0.55 }}>
            {isDragging ? "Release to convert" : "Drop images or"}
          </p>
          {!isDragging && (
            <motion.button
              onClick={onBrowse}
              whileHover={{ opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              tabIndex={0}
              aria-label="Browse files"
              style={{
                fontSize: 15, fontWeight: 600, marginTop: 2,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#04BFCB', opacity: 0.9,
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              browse files
            </motion.button>
          )}
          <p style={{ fontSize: 11, opacity: 0.2, marginTop: 12, letterSpacing: '0.03em' }}>
            HEIC · JPEG · PNG · WebP · TIFF · GIF
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
