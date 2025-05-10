package ytdlp

import (
	"fmt"
	"io"
	"os/exec"
)

func run(bin string, args ...string) (stdout io.ReadCloser, stderr io.ReadCloser, waitFun func() error, err error) {
	cmd := exec.Command(bin, args...)
	stdout, err = cmd.StdoutPipe()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("stdout pipe failed: %w", err)
	}
	stderr, err = cmd.StderrPipe()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("stderr pipe failed: %w", err)
	}
	if err = cmd.Start(); err != nil {
		return nil, nil, nil, fmt.Errorf("failed to start command: %w", err)
	}
	return stdout, stderr, cmd.Wait, nil
}
