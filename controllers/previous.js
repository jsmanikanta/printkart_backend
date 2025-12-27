const verifyToken = require("./verifyToken");

const getPreviousYears = async (req, res) => {
  try {
    const { subject, branch, college, sem, year } = req.query;
    
    if (!subject || !college || !sem || !year) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required filters: subject, college, sem, year" 
      });
    }

    const filter = {
      subject: subject,
      college: college,
      sem: sem,
      year: year
    };
    
    if (branch) {
      filter.branch = branch;
    }

    const papers = await PreviousYearPaper.find(filter)
      .select("subject branch college sem year file exam_date uploaded_at")
      .sort({ year: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: papers.length,
      filters: {
        subject,
        branch,
        college,
        sem,
        year
      },
      data: papers.map((paper) => ({
        id: paper._id,
        subject: paper.subject,
        branch: paper.branch,
        college: paper.college,
        sem: paper.sem,
        year: paper.year,
        file_url: paper.file, 
      }))
    });

  } catch (error) {
    console.error("Error fetching previous year papers:", error);
    return res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
};

app.get('previous-years-papers', verifyToken, getPreviousYears);


