const mongoose = require('mongoose');

const getPreviousYears = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false,
        error: "Database not ready" 
      });
    }
    
    const { subject, branch, college, sem, year } = req.query;
    
    if (!subject || !college || !sem || !year) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required filters: subject, college, sem, year" 
      });
    }

    const filter = { subject, college, sem, year };
    if (branch) filter.branch = branch;

    const papersData = await mongoose.connection.collection('papers').find(filter)
      .project({
        subject: 1, branch: 1, college: 1, sem: 1, year: 1, 
        file: 1, exam_date: 1, uploaded_at: 1
      })
      .sort({ year: -1 })
      .limit(50)
      .toArray();

    return res.status(200).json({
      success: true,
      count: papersData.length,
      filters: {
        subject,
        branch: branch || 'All Branches',
        college,
        sem,
        year
      },
      data: papersData.map((paper) => ({
        id: paper._id.toString(),
        subject: paper.subject,
        branch: paper.branch || 'N/A',
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

module.exports = { getPreviousYears };
