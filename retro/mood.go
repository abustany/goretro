package retro

import "fmt"

type Mood int

const (
	PositiveMood Mood = iota + 1
	NegativeMood
	ConfusedMood
)

func moodFromInt(i uint) (Mood, error) {
	switch i {
	case uint(PositiveMood), uint(NegativeMood), uint(ConfusedMood):
		return Mood(i), nil
	default:
		return 0, fmt.Errorf("invalid value: %d", i)
	}
}
