import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  resetKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("UI error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState((s) => ({
      hasError: false,
      message: "",
      resetKey: s.resetKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            textAlign: "center",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 12, opacity: 0.4, maxWidth: 260 }}>
            {this.state.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              padding: "8px 20px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              color: "#fff",
            }}
            className="brand-btn"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div key={this.state.resetKey} style={{ height: "100%" }}>
        {this.props.children}
      </div>
    );
  }
}
